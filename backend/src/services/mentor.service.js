'use strict';
const { Op } = require('sequelize');
const {
  User, Project, ProjectMentor, Notification, AdminAction
} = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');

const TYPE_TO_AREA = {
  software:      'software',
  ai_model:      'ai_ml',
  data_pipeline: 'data',
  research:      'research'
};

const AREA_LABELS = {
  software: 'Engenharia de Software',
  ai_ml:    'Inteligência Artificial / Machine Learning',
  data:     'Ciência de Dados / Pipelines',
  research: 'Investigação Científica'
};

const AREA_KEYWORDS = {
  software: ['software','engenharia','desenvolvimento','web','backend','frontend','sistemas','arquitectura'],
  ai_ml:    ['inteligência artificial','ia','machine learning','ml','deep learning','redes neuronais','dados','modelos'],
  data:     ['dados','data science','pipeline','etl','análise','estatística','bases de dados'],
  research: ['investigação','científic','pesquisa','publicação','académic','metodologia']
};

class MentorService {

  _calculateScore(mentor, area) {
    const bio = (mentor.bio || '').toLowerCase();
    const keywords = AREA_KEYWORDS[area] || [];
    let score = 0;
    keywords.forEach(kw => { if (bio.includes(kw)) score += 15; });
    if (mentor.role === 'mentor') score += 20;
    if (mentor.role === 'admin')  score += 10;
    return Math.min(score, 100);
  }

  async autoAssignMentor(projectId) {
    const project = await Project.findByPk(projectId, {
      include: [{ model: User, as: 'creator', attributes: ['name','id'] }]
    });
    if (!project) throw new AppError('Projecto não encontrado.', 404);

    const area = TYPE_TO_AREA[project.type] || 'software';

    const existing = await ProjectMentor.findOne({
      where: { project_id: projectId, status: 'active' }
    });
    if (existing) return { already_assigned: true, mentor_id: existing.mentor_id };

    const candidates = await User.findAll({
      where: { role: { [Op.in]: ['mentor','admin'] }, is_active: true }
    });

    if (!candidates.length) {
      throw new AppError('Não há mentores disponíveis na plataforma.', 404);
    }

    const scored = candidates.map(m => ({
      mentor: m,
      score: this._calculateScore(m, area)
    })).sort((a,b) => b.score - a.score);

    const workloads = await ProjectMentor.findAll({
      where: { status: 'active' },
      attributes: ['mentor_id', [require('sequelize').fn('COUNT','*'),'count']],
      group: ['mentor_id'], raw: true
    });
    const workloadMap = {};
    workloads.forEach(w => { workloadMap[w.mentor_id] = parseInt(w.count); });

    scored.forEach(s => {
      const load = workloadMap[s.mentor.id] || 0;
      s.finalScore = s.score - (load * 5);
    });
    scored.sort((a,b) => b.finalScore - a.finalScore);

    const chosen = scored[0];

    const assignment = await ProjectMentor.create({
      project_id: projectId,
      mentor_id:  chosen.mentor.id,
      assigned_by: 'ai',
      area,
      ai_score: chosen.score,
      notes: `Atribuído automaticamente com base na área "${AREA_LABELS[area]}". Pontuação de compatibilidade: ${chosen.score}/100.`
    });

    await Notification.create({
      user_id: chosen.mentor.id, type: 'info',
      title: `🎓 Novo projecto atribuído: "${project.title}"`,
      message: `Foi designado como mentor para este projecto de ${AREA_LABELS[area]}. Criador: ${project.creator?.name}.`,
      action_url: `/project-detail.html?id=${projectId}`
    });

    await Notification.create({
      user_id: project.created_by, type: 'success',
      title: `🎓 Mentor atribuído ao seu projecto`,
      message: `${chosen.mentor.name} foi designado como seu mentor para "${project.title}".`,
      action_url: `/project-detail.html?id=${projectId}`
    });

    return {
      assignment, mentor: { id:chosen.mentor.id, name:chosen.mentor.name, email:chosen.mentor.email },
      area, score: chosen.score
    };
  }

  async getProjectMentor(projectId) {
    return ProjectMentor.findOne({
      where: { project_id: projectId, status: 'active' },
      include: [{ model: User, as: 'mentor', attributes: ['id','name','email','bio','role'] }]
    });
  }

  async getMentorProjects(mentorId) {
    return ProjectMentor.findAll({
      where: { mentor_id: mentorId, status: 'active' },
      include: [{ model: Project, as: 'Project', attributes: ['id','title','type','status','created_by'] }],
      order: [['created_at','DESC']]
    });
  }

  async reassignMentor(projectId, newMentorId, adminId) {
    const existing = await ProjectMentor.findOne({ where:{ project_id:projectId, status:'active' } });
    if (existing) await existing.update({ status:'reassigned' });

    const project = await Project.findByPk(projectId);
    const newMentor = await User.findByPk(newMentorId);
    if (!project || !newMentor) throw new AppError('Projecto ou mentor não encontrado.', 404);

    const area = TYPE_TO_AREA[project.type] || 'software';
    const assignment = await ProjectMentor.create({
      project_id: projectId, mentor_id: newMentorId,
      assigned_by: 'admin', area,
      notes: `Reatribuído manualmente pelo administrador.`
    });

    await Notification.create({
      user_id: newMentorId, type:'info',
      title: `🎓 Foi designado mentor de "${project.title}"`,
      message: `Um administrador atribuiu-lhe este projecto.`,
      action_url: `/project-detail.html?id=${projectId}`
    });

    await AdminAction.create({
      admin_id: adminId, action:'reassign_mentor',
      target_type:'project', target_id:projectId,
      details: JSON.stringify({ new_mentor: newMentor.name })
    });

    return assignment;
  }

  async listMentorsWithStats() {
    const mentors = await User.findAll({
      where: { role: { [Op.in]: ['mentor','admin'] }, is_active: true },
      attributes: ['id','name','email','bio','role']
    });
    const assignments = await ProjectMentor.findAll({ where:{ status:'active' } });
    return mentors.map(m => ({
      ...m.toJSON(),
      active_projects: assignments.filter(a => a.mentor_id === m.id).length,
      areas: Object.keys(AREA_KEYWORDS).map(area => ({
        area, label: AREA_LABELS[area], score: this._calculateScore(m, area)
      })).sort((a,b)=>b.score-a.score)
    }));
  }
}

module.exports = new MentorService();
