'use strict';
const request = require('supertest');

// Mock das dependências de base de dados para testes
jest.mock('../src/config/database', () => ({
  sequelize: { authenticate: jest.fn().mockResolvedValue(true), sync: jest.fn().mockResolvedValue(true), close: jest.fn() },
  Sequelize: require('sequelize').Sequelize
}));
jest.mock('../src/config/mongodb', () => jest.fn().mockResolvedValue(true));

describe('INKU·AI API', () => {
  let app;
  beforeAll(() => { app = require('../src/app'); });

  it('GET /health → 200 com status healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.platform).toBe('INKU·AI');
  });

  it('GET /api/v1 → 200 com informação da API', async () => {
    const res = await request(app).get('/api/v1');
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('INKU·AI Platform API');
  });

  it('POST /api/v1/auth/login sem dados → 422', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.statusCode).toBe(422);
  });
});
