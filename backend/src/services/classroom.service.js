'use strict';
const { exec } = require('child_process');
const fs   = require('fs').promises;
const path = require('path');
const os   = require('os');
const {
  Classroom, ClassroomSubmission, Project, User, Notification
} = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');
const mentorService = require('./mentor.service');

class ClassroomService {

  async createClassroom(data, creatorId) {
    const project = await Project.findByPk(data.project_id);
    if (!project) throw new AppError('Projecto não encontrado.', 404);

    const mentorAssign = await mentorService.getProjectMentor(data.project_id);

    const classroom = await Classroom.create({
      project_id:  data.project_id,
      name:        data.name || `Espaço — ${project.title}`,
      description: data.description || '',
      type:        data.type || 'workspace',
      settings:    JSON.stringify(data.settings || {}),
      created_by:  creatorId,
      mentor_id:   mentorAssign?.mentor_id || null
    });

    if (mentorAssign?.mentor_id) {
      await Notification.create({
        user_id: mentorAssign.mentor_id, type:'info',
        title: `📚 Novo espaço de trabalho: "${classroom.name}"`,
        message: `Foi criado um classroom para o projecto "${project.title}" que mentoriza.`,
        action_url: `/classroom-detail.html?id=${classroom.id}`
      });
    }

    return classroom;
  }

  async listClassrooms(userId, role, { page=1, limit=20 }) {
    const { Op } = require('sequelize');
    let where = {};
    if (role === 'admin') {
      // admin vê tudo
    } else if (role === 'mentor') {
      where = { [Op.or]: [{ mentor_id:userId }, { created_by:userId }] };
    } else {
      where = { created_by:userId };
    }
    const { count, rows } = await Classroom.findAndCountAll({
      where, limit, offset:(page-1)*limit,
      include: [
        { model: Project, as:'project',  attributes:['id','title','type','status'] },
        { model: User,    as:'creator',  attributes:['id','name'] },
        { model: User,    as:'mentor',   attributes:['id','name'] }
      ],
      order: [['created_at','DESC']]
    });
    return { classrooms:rows, total:count };
  }

  async getClassroom(classroomId, userId, role) {
    const c = await Classroom.findByPk(classroomId, {
      include: [
        { model: Project, as:'project', attributes:['id','title','type','status','description'] },
        { model: User,    as:'creator', attributes:['id','name','email'] },
        { model: User,    as:'mentor',  attributes:['id','name','email'] },
        { model: ClassroomSubmission, as:'submissions', include:[{model:User,as:'author',attributes:['id','name']}] }
      ]
    });
    if (!c) throw new AppError('Classroom não encontrado.', 404);

    const isOwner  = c.created_by === userId;
    const isMentor = c.mentor_id === userId;
    const isAdmin  = role === 'admin';
    if (!isOwner && !isMentor && !isAdmin) throw new AppError('Sem permissão para ver este classroom.', 403);

    return c;
  }

  async submit(classroomId, authorId, data) {
    const classroom = await Classroom.findByPk(classroomId);
    if (!classroom) throw new AppError('Classroom não encontrado.', 404);

    const submission = await ClassroomSubmission.create({
      classroom_id: classroomId,
      author_id:    authorId,
      title:        data.title || 'Submissão',
      code:         data.code || '',
      description:  data.description || '',
      language:     data.language || 'python',
      file_urls:    JSON.stringify(data.file_urls || []),
      status:       'submitted'
    });

    if (classroom.mentor_id) {
      const author = await User.findByPk(authorId);
      await Notification.create({
        user_id: classroom.mentor_id, type:'info',
        title: `📝 Nova submissão em "${classroom.name}"`,
        message: `${author?.name} submeteu "${submission.title}".`,
        action_url: `/classroom-detail.html?id=${classroomId}`
      });
    }

    return submission;
  }

  async executeSubmission(submissionId) {
    const submission = await ClassroomSubmission.findByPk(submissionId, {
      include:[{model:Classroom,as:'classroom'}]
    });
    if (!submission) throw new AppError('Submissão não encontrada.', 404);

    await submission.update({ status:'running' });

    let output = '';
    try {
      if (submission.language === 'python') {
        output = await this._runPython(submission.code);
      } else if (submission.language === 'javascript') {
        output = await this._runJavaScript(submission.code);
      } else {
        output = '⚠️ Linguagem não suportada para execução automática. Apenas Python e JavaScript são executados.';
      }
      await submission.update({ status:'executed', execution_result: output });
    } catch (err) {
      output = `❌ Erro de execução:\n${err.message}`;
      await submission.update({ status:'executed', execution_result: output });
    }

    return { submission, output };
  }

  async _runPython(code) {
    const tmpFile = path.join(os.tmpdir(), `sub_${Date.now()}.py`);
    await fs.writeFile(tmpFile, code, 'utf8');
    return new Promise((resolve, reject) => {
      exec(`timeout 10 python3 "${tmpFile}"`, { maxBuffer: 1024*1024 }, async (err, stdout, stderr) => {
        await fs.unlink(tmpFile).catch(()=>{});
        if (err && !stdout) return reject(new Error(stderr || err.message));
        resolve(stdout + (stderr ? `\n[stderr]\n${stderr}` : ''));
      });
    });
  }

  async _runJavaScript(code) {
    const tmpFile = path.join(os.tmpdir(), `sub_${Date.now()}.js`);
    await fs.writeFile(tmpFile, code, 'utf8');
    return new Promise((resolve, reject) => {
      exec(`timeout 10 node "${tmpFile}"`, { maxBuffer: 1024*1024 }, async (err, stdout, stderr) => {
        await fs.unlink(tmpFile).catch(()=>{});
        if (err && !stdout) return reject(new Error(stderr || err.message));
        resolve(stdout + (stderr ? `\n[stderr]\n${stderr}` : ''));
      });
    });
  }

  async aiGrade(submissionId) {
    const submission = await ClassroomSubmission.findByPk(submissionId, {
      include:[{model:Classroom,as:'classroom',include:[{model:Project,as:'project'}]}]
    });
    if (!submission) throw new AppError('Submissão não encontrada.', 404);

    const key = (process.env.GEMINI_API_KEY || '').trim();
    if (!key) throw new AppError('GEMINI_API_KEY não configurada.', 503);
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const model = new GoogleGenerativeAI(key).getGenerativeModel({ model:'gemini-1.5-flash' });

    const prompt = `Avalia esta submissão de código de um estudante da IP/UNIKIVI Angola:

PROJECTO: ${submission.classroom?.project?.title || '—'}
LINGUAGEM: ${submission.language}
TÍTULO: ${submission.title}
DESCRIÇÃO: ${submission.description}

CÓDIGO:
\`\`\`${submission.language}
${(submission.code||'').substring(0,3000)}
\`\`\`

RESULTADO DE EXECUÇÃO:
${(submission.execution_result||'Não executado').substring(0,1000)}

Avalia de 0-100 considerando: correção, boas práticas, eficiência, legibilidade.
Responde APENAS com JSON:
{"grade": 85, "feedback": "Feedback detalhado e construtivo em português de Angola, incluindo pontos fortes e sugestões de melhoria"}`;

    const result = await model.generateContent(prompt);
    const text   = result.response.text().trim();

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json\n?|\n?```/g,'').trim());
    } catch {
      parsed = { grade: 70, feedback: text };
    }

    await submission.update({
      ai_grade: parsed.grade, ai_feedback: parsed.feedback,
      status:'graded', graded_at: new Date()
    });

    await Notification.create({
      user_id: submission.author_id, type: parsed.grade>=70?'success':'warning',
      title: `🤖 A tua submissão foi avaliada: ${parsed.grade}/100`,
      message: `"${submission.title}" recebeu feedback da IA.`,
      action_url: `/classroom-detail.html?id=${submission.classroom_id}`
    });

    return { submission, grade: parsed.grade, feedback: parsed.feedback };
  }

  async mentorGrade(submissionId, mentorId, grade, feedback) {
    const submission = await ClassroomSubmission.findByPk(submissionId);
    if (!submission) throw new AppError('Submissão não encontrada.', 404);

    await submission.update({
      mentor_grade: grade, mentor_feedback: feedback,
      status:'returned', graded_at: new Date()
    });

    await Notification.create({
      user_id: submission.author_id, type: grade>=70?'success':'warning',
      title: `🎓 O mentor avaliou a tua submissão: ${grade}/100`,
      message: `"${submission.title}" recebeu feedback.`,
      action_url: `/classroom-detail.html?id=${submission.classroom_id}`
    });

    return submission;
  }
}

module.exports = new ClassroomService();
