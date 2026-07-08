'use strict';
const { Comment, Follow, Reputation, User, Notification } = require('../models/sql/index');
const { AppError } = require('../utils/apiResponse');
const { Op } = require('sequelize');

// ── XP / Level system
const XP_EVENTS = {
  project_created: 50, submission_sent: 20, comment_posted: 5,
  article_published: 30, received_like: 2, follower_gained: 10,
  project_approved: 100, mentor_session: 40, roadmap_phase_done: 60
};
const LEVELS = [
  { min:0,    level:1, badge:'🌱 Iniciante' },
  { min:100,  level:2, badge:'⚡ Explorador' },
  { min:300,  level:3, badge:'🔥 Inovador' },
  { min:600,  level:4, badge:'🚀 Builder' },
  { min:1000, level:5, badge:'💎 Visionário' },
  { min:1800, level:6, badge:'🏆 Pioneiro' },
  { min:3000, level:7, badge:'👑 Mestre INKU' },
];

async function gainXP(userId, event) {
  const pts = XP_EVENTS[event] || 0;
  if (!pts) return;
  let rep = await Reputation.findOne({ where: { user_id: userId } });
  if (!rep) rep = await Reputation.create({ user_id: userId });
  const newXP = (rep.xp || 0) + pts;
  const lvl = [...LEVELS].reverse().find(l => newXP >= l.min) || LEVELS[0];
  await rep.update({
    xp: newXP, level: lvl.level, badge: lvl.badge,
    last_activity: new Date()
  });
  // Notify on level up
  if (lvl.level > rep.level) {
    await Notification.create({
      user_id: userId, type: 'success',
      title: `🎉 Subiu para ${lvl.badge}!`,
      message: `Parabéns! Atingiu o nível ${lvl.level} na plataforma INKU·AI.`,
      action_url: '/profile.html'
    });
  }
  return rep;
}

class SocialService {
  // ── COMENTÁRIOS
  async addComment({ authorId, targetType, targetId, body, parentId }) {
    if (!body?.trim()) throw new AppError('Comentário não pode estar vazio.', 400);
    const comment = await Comment.create({
      author_id: authorId, target_type: targetType,
      target_id: targetId, body: body.trim(),
      parent_id: parentId || null
    });
    await gainXP(authorId, 'comment_posted');
    await Reputation.increment('comments_count', { by: 1, where: { user_id: authorId } });
    return Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id','name','avatar_url','role'] }]
    });
  }

  async getComments(targetType, targetId) {
    const comments = await Comment.findAll({
      where: { target_type: targetType, target_id: targetId, parent_id: null, is_deleted: false },
      include: [
        { model: User, as: 'author', attributes: ['id','name','avatar_url','role'] },
        {
          model: Comment, as: 'replies',
          where: { is_deleted: false }, required: false,
          include: [{ model: User, as: 'author', attributes: ['id','name','avatar_url','role'] }]
        }
      ],
      order: [['is_pinned','DESC'],['created_at','ASC']]
    });
    return comments;
  }

  async likeComment(commentId, userId) {
    const c = await Comment.findByPk(commentId);
    if (!c) throw new AppError('Comentário não encontrado.', 404);
    await c.increment('likes');
    await gainXP(c.author_id, 'received_like');
    return { likes: c.likes + 1 };
  }

  async deleteComment(commentId, userId, role) {
    const c = await Comment.findByPk(commentId);
    if (!c) throw new AppError('Comentário não encontrado.', 404);
    if (c.author_id !== userId && role !== 'admin') throw new AppError('Sem permissão.', 403);
    await c.update({ is_deleted: true, body: '[comentário removido]' });
    return { deleted: true };
  }

  // ── FOLLOWS
  async follow(followerId, targetType, targetId) {
    const existing = await Follow.findOne({
      where: { follower_id: followerId, target_type: targetType, target_id: targetId }
    });
    if (existing) {
      await existing.destroy();
      if (targetType === 'user') {
        await Reputation.decrement('following_count', { by:1, where:{ user_id: followerId } });
        await Reputation.decrement('followers_count', { by:1, where:{ user_id: targetId } });
      }
      return { following: false };
    }
    await Follow.create({ follower_id: followerId, target_type: targetType, target_id: targetId });
    if (targetType === 'user') {
      await Reputation.increment('following_count', { by:1, where:{ user_id: followerId } });
      let rep = await Reputation.findOne({ where: { user_id: targetId } });
      if (!rep) rep = await Reputation.create({ user_id: targetId });
      await rep.increment('followers_count');
      await gainXP(targetId, 'follower_gained');
      // Notify target
      const follower = await User.findByPk(followerId, { attributes: ['name'] });
      await Notification.create({
        user_id: targetId, type: 'info',
        title: `👤 ${follower?.name} começou a seguir-te`,
        message: 'Tens um novo seguidor na plataforma!',
        action_url: `/profile.html?id=${followerId}`
      });
    }
    return { following: true };
  }

  async isFollowing(followerId, targetType, targetId) {
    const f = await Follow.findOne({
      where: { follower_id: followerId, target_type: targetType, target_id: targetId }
    });
    return !!f;
  }

  async getFollowers(targetType, targetId) {
    const follows = await Follow.findAll({
      where: { target_type: targetType, target_id: targetId },
      include: [{ model: User, as: 'follower', attributes: ['id','name','avatar_url','role','institution'] }]
    });
    return follows.map(f => f.follower);
  }

  async getFollowing(userId) {
    return Follow.findAll({
      where: { follower_id: userId, target_type: 'user' }
    });
  }

  // ── REPUTATION
  async getReputation(userId) {
    let rep = await Reputation.findOne({ where: { user_id: userId } });
    if (!rep) rep = await Reputation.create({ user_id: userId });
    const nextLevel = LEVELS.find(l => l.min > (rep.xp || 0));
    return {
      ...rep.toJSON(),
      next_level_xp: nextLevel?.min || null,
      xp_to_next: nextLevel ? nextLevel.min - rep.xp : 0,
      progress_pct: nextLevel
        ? Math.round(((rep.xp - (LEVELS[rep.level-1]?.min||0)) / (nextLevel.min - (LEVELS[rep.level-1]?.min||0))) * 100)
        : 100
    };
  }

  async gainXP(userId, event) { return gainXP(userId, event); }
}

module.exports = new SocialService();
