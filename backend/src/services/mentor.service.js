'use strict';
const { MentorAssignment, User, Project, Notification } = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');
const Anthropic = require('@anthropic-ai/sdk');

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Mapa tipo projecto -> áreas de expertise relevantes
const TYPE_EXPERTISE = {
  software:      ['software','web','mobile','backend','frontend','fullstack','programação','desenvolvimento'],
  ai_model:      ['ia','inteligência artificial','machine learning','deep learning','nlp','dados','ml','visão'],
  data_pipeline: ['dados','data science','bigdata','pipeline','analytics','base de dados','estatística'],
  research:      ['investigação','científica','académica','publicação','doutoramento','phd','metodologia']
};

class MentorService {

  // Listar todos os mentores disponíveis
  async listMentors() {
    const mentors = await User.findAll({
      where: { role: ['mentor', 'admin'], is_active: true },
      attributes: ['id','name','email','bio','mentor_bio','expertise_areas','institution','avatar_url','role','created_at']
    });
    return mentors.map(m => ({
      ...m.toJSON(),
      expertise_areas: (() => { try { return JSON.parse(m.expertise_areas||'[]'); } catch { return []; } })(),
      active_mentorings: 0
    }));
  }

  // Criar/actualizar mentor (admin only)
  async upsertMentor({ userId, expertiseAreas, mentorBio }) {
    const user = await User.findByPk(userId);
    if (!user) throw new AppError('Utilizador não encontrado.', 404);

    await user.update({
      role: 'mentor',
      expertise_areas: JSON.stringify(expertiseAreas || []),
      mentor_bio: mentorBio || user.bio
    });

    await Notification.create({
      user_id: userId, type: 'success',
      title: '🎓 Conta de Mentor Activada',
      message: 'A sua conta foi configurada como mentor na plataforma INKU·AI. Projectos relevantes serão atribuídos automaticamente.',
      action_url: '/dashboard.html'
    });

    return user;
  }

  // Auto-assign via IA (usa Claude para escolher o melhor mentor)
  async autoAssign(projectId) {
    const project = await Project.findByPk(projectId, {
      include: [{ model: User, as: 'creator', attributes: ['name'] }]
    });
    if (!project) throw new AppError('Projecto não encontrado.', 404);

    // Já tem mentor activo?
    const existing = await MentorAssignment.findOne({
      where: { project_id: projectId, status: 'active' },
      include: [{ model: User, as: 'mentor', attributes: ['id','name','role'] }]
    });
    if (existing) return existing;

    // Buscar mentores disponíveis
    const mentors = await User.findAll({
      where: { role: ['mentor', 'admin'], is_active: true },
      attributes: ['id','name','bio','mentor_bio','expertise_areas','role']
    });
    if (!mentors.length) return null;

    // Usar IA para escolher o melhor mentor
    let bestMentorId = null;
    try {
      const mentorList = mentors.map(m => {
        const areas = (() => { try { return JSON.parse(m.expertise_areas||'[]'); } catch { return []; } })();
        return `ID:${m.id} | Nome:${m.name} | Áreas:${areas.join(',')} | Bio:${(m.mentor_bio||m.bio||'').substring(0,100)}`;
      }).join('\n');

      const prompt = `Tens de escolher o melhor mentor para este projecto.

PROJECTO:
- Título: ${project.title}
- Tipo: ${project.type}
- Descrição: ${(project.description||'').substring(0,300)}
- Stack: ${JSON.stringify(project.tech_stack||[])}

MENTORES DISPONÍVEIS:
${mentorList}

Responde APENAS com o UUID do mentor mais adequado (ex: "550e8400-e29b-41d4-a716-446655440000"). Nada mais.`;

      const resp = await ai.messages.create({
        model: 'claude-sonnet-4-6', max_tokens: 100,
        messages: [{ role: 'user', content: prompt }]
      });
      const chosenId = resp.content[0].text.trim().replace(/[^a-f0-9-]/gi,'');
      if (mentors.find(m => m.id === chosenId)) bestMentorId = chosenId;
    } catch(e) {
      console.warn('[MentorAI] Fallback to scoring:', e.message);
    }

    // Fallback: score por keywords
    if (!bestMentorId) {
      const keywords = TYPE_EXPERTISE[project.type] || TYPE_EXPERTISE.software;
      let best = null, bestScore = -1;
      for (const m of mentors) {
        const areas = (() => { try { return JSON.parse(m.expertise_areas||'[]'); } catch { return []; } })();
        const text = (areas.join(' ') + ' ' + (m.mentor_bio||m.bio||'')).toLowerCase();
        const score = keywords.filter(k => text.includes(k)).length;
        const load = await MentorAssignment.count({ where: { mentor_id: m.id, status: 'active' } });
        const final = score * 2 - load;
        if (final > bestScore) { bestScore = final; best = m; }
      }
      bestMentorId = best?.id || mentors[0].id;
    }

    const mentor = mentors.find(m => m.id === bestMentorId) || mentors[0];
    const assignment = await MentorAssignment.create({
      project_id: projectId, mentor_id: mentor.id,
      assigned_by: 'ai', expertise: project.type,
      notes: `Atribuído pela IA com base no tipo: ${project.type}`
    });

    // Notificar mentor
    await Notification.create({
      user_id: mentor.id, type: 'info',
      title: `📋 Novo projecto para mentoria`,
      message: `A IA atribuiu-lhe o projecto "${project.title}" (${project.type}) para orientação.`,
      action_url: `/classroom.html?project=${projectId}`
    });
    // Notificar dono
    await Notification.create({
      user_id: project.created_by, type: 'success',
      title: `👨‍🏫 Mentor atribuído: ${mentor.name}`,
      message: `A IA seleccionou "${mentor.name}" como mentor do seu projecto "${project.title}".`,
      action_url: `/classroom.html?project=${projectId}`
    });

    return { ...assignment.toJSON(), mentor };
  }

  async getProjectMentor(projectId) {
    return MentorAssignment.findOne({
      where: { project_id: projectId, status: 'active' },
      include: [{ model: User, as: 'mentor', attributes: ['id','name','bio','mentor_bio','expertise_areas','avatar_url','role'] }]
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

    await MentorAssignment.update({ status: 'completed' }, { where: { project_id: projectId, status: 'active' } });

    const assignment = await MentorAssignment.create({
      project_id: projectId, mentor_id: mentorId,
      assigned_by: 'admin', expertise: project.type
    });

    await Notification.create({
      user_id: mentorId, type: 'info',
      title: `📋 Projecto atribuído pelo Administrador`,
      message: `Foi-lhe atribuído o projecto "${project.title}" para orientação.`,
      action_url: `/classroom.html?project=${projectId}`
    });

    await Notification.create({
      user_id: project.created_by, type: 'success',
      title: `👨‍🏫 Mentor atribuído: ${mentor.name}`,
      message: `O administrador atribuiu "${mentor.name}" como mentor do seu projecto.`,
      action_url: `/classroom.html?project=${projectId}`
    });

    return assignment;
  }
}

module.exports = new MentorService();
