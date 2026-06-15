'use strict';
const { MentorAssignment, User, Project, Notification } = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');

// Map project type -> mentor expertise keywords
const TYPE_EXPERTISE = {
  software:      ['software','web','mobile','backend','frontend','fullstack','programação'],
  ai_model:      ['ia','machine learning','deep learning','nlp','visão computacional','dados','ml'],
  data_pipeline: ['dados','data science','bigdata','pipeline','analytics','base de dados'],
  research:      ['investigação','científica','académica','publicação','doutoramento','phd']
};

class MentorService {

  // Auto-assign mentor based on project type
  async autoAssign(projectId) {
    const project = await Project.findByPk(projectId, {
      include: [{ model: User, as: 'creator', attributes: ['name'] }]
    });
    if (!project) throw new AppError('Projecto não encontrado.', 404);

    // Check if already has active mentor
    const existing = await MentorAssignment.findOne({
      where: { project_id: projectId, status: 'active' }
    });
    if (existing) return existing;

    // Find available mentors (role: mentor or admin) with relevant expertise
    const mentors = await User.findAll({
      where: { role: ['mentor', 'admin'], is_active: true },
      attributes: ['id','name','bio','role']
    });

    if (!mentors.length) return null;

    // Score each mentor by expertise match
    const keywords = TYPE_EXPERTISE[project.type] || TYPE_EXPERTISE.software;
    let bestMentor = null, bestScore = -1;

    for (const m of mentors) {
      const bio = (m.bio || '').toLowerCase();
      const score = keywords.filter(k => bio.includes(k)).length;
      // Also check workload - fewer active assignments = better
      const load = await MentorAssignment.count({ where: { mentor_id: m.id, status: 'active' } });
      const finalScore = score * 2 - load; // balance expertise vs workload
      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestMentor = m;
      }
    }

    if (!bestMentor) bestMentor = mentors[0]; // fallback to first mentor

    const assignment = await MentorAssignment.create({
      project_id:  projectId,
      mentor_id:   bestMentor.id,
      assigned_by: 'auto',
      expertise:   project.type,
      notes: `Atribuído automaticamente com base no tipo de projecto: ${project.type}`
    });

    // Notify mentor
    await Notification.create({
      user_id: bestMentor.id, type: 'info',
      title: `📋 Novo projecto para mentoria`,
      message: `Foram-lhe atribuído o projecto "${project.title}" para orientação (${project.type}).`,
      action_url: `/pages/project-detail.html?id=${projectId}`
    });

    // Notify project owner
    await Notification.create({
      user_id: project.created_by, type: 'success',
      title: `👨‍🏫 Mentor atribuído: ${bestMentor.name}`,
      message: `O seu projecto "${project.title}" tem agora um mentor atribuído automaticamente.`,
      action_url: `/pages/project-detail.html?id=${projectId}`
    });

    return { ...assignment.toJSON(), mentor: bestMentor };
  }

  async getProjectMentor(projectId) {
    return MentorAssignment.findOne({
      where: { project_id: projectId, status: 'active' },
      include: [{ model: User, as: 'mentor', attributes: ['id','name','bio','avatar_url','role'] }]
    });
  }

  async getMentorProjects(mentorId) {
    return MentorAssignment.findAll({
      where: { mentor_id: mentorId, status: 'active' },
      include: [{
        model: Project, as: 'project',
        include: [{ model: User, as: 'creator', attributes: ['id','name'] }]
      }]
    });
  }

  async manualAssign(projectId, mentorId, adminId) {
    const [project, mentor] = await Promise.all([
      Project.findByPk(projectId),
      User.findByPk(mentorId)
    ]);
    if (!project) throw new AppError('Projecto não encontrado.', 404);
    if (!mentor || !['mentor','admin'].includes(mentor.role)) throw new AppError('Utilizador não é mentor.', 400);

    // Deactivate old assignment if any
    await MentorAssignment.update({ status: 'completed' }, { where: { project_id: projectId, status: 'active' } });

    const assignment = await MentorAssignment.create({
      project_id: projectId, mentor_id: mentorId,
      assigned_by: 'admin', expertise: project.type
    });

    await Notification.create({
      user_id: mentorId, type: 'info',
      title: `📋 Projecto atribuído`,
      message: `Administrador atribuiu-lhe o projecto "${project.title}".`,
      action_url: `/pages/project-detail.html?id=${projectId}`
    });

    return assignment;
  }
}

module.exports = new MentorService();
