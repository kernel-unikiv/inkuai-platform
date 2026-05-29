'use strict';
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const BLOCKED_PATTERNS = [
  /import\s+os\b/, /import\s+subprocess/, /import\s+socket\b/,
  /import\s+requests/, /__import__\s*\(/, /open\s*\(.*['"]\s*w/
];

// In-memory store quando MongoDB não está disponível
const getStore = () => {
  if (global._inMemoryDB) return global._inMemoryDB.executions;
  try {
    return require('../models/nosql/Execution.schema');
  } catch { return null; }
};

class SandboxService {
  async executeCode({ code, project_id, user_id, type = 'python' }) {
    // Validação de segurança
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(code)) throw new AppError('Código bloqueado: módulo não permitido.', 400);
    }

    const executionId = uuidv4();
    const startTime = Date.now();
    
    const execution = {
      _id: executionId, project_id, user_id,
      execution_type: type, code_snapshot: code,
      status: 'running', created_at: new Date()
    };

    // Guardar no store
    const store = getStore();
    if (Array.isArray(store)) store.push(execution);

    try {
      const result = await this._simulateExecution(code, type);
      const execTime = Date.now() - startTime;

      Object.assign(execution, {
        status: result.success ? 'completed' : 'failed',
        stdout: result.stdout, stderr: result.stderr,
        exit_code: result.success ? 0 : 1,
        execution_time_ms: execTime,
        completed_at: new Date()
      });

      logger.info(`Sandbox: ${executionId} | ${execution.status} | ${execTime}ms`);
      return { executionId, status: execution.status, stdout: execution.stdout,
        stderr: execution.stderr, exitCode: execution.exit_code, executionTime: execTime };

    } catch (error) {
      execution.status = 'failed';
      execution.stderr = error.message;
      throw new AppError('Erro na execução do sandbox.', 500);
    }
  }

  _simulateExecution(code, type) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (type === 'ai_training') {
          resolve({
            success: true,
            stdout: [
              'INKU·AI Sandbox — Treino IA iniciado',
              'Epoch  1/10 | loss: 0.6231 | acc: 0.6112',
              'Epoch  3/10 | loss: 0.3847 | acc: 0.8234',
              'Epoch  5/10 | loss: 0.1987 | acc: 0.9156',
              'Epoch  8/10 | loss: 0.0981 | acc: 0.9512',
              'Epoch 10/10 | loss: 0.0672 | acc: 0.9723',
              '',
              '✓ Treino concluído | Acurácia final: 97.23%',
              '✓ Modelo guardado: /workspace/model_v1.pkl'
            ].join('\n'),
            stderr: ''
          });
        } else {
          // Simular execução Python básica
          const lines = code.split('\n');
          const outputs = [];
          for (const line of lines) {
            const m = line.match(/print\s*\(\s*[f]?["'`](.*)["'`]\s*\)/);
            if (m) outputs.push(m[1]);
            if (line.match(/print\s*\(\s*(\d[\d\s\+\-\*\/\.]+)\s*\)/)) {
              try { outputs.push(String(eval(line.match(/print\s*\((.*)\)/)[1]))); } catch {}
            }
          }
          resolve({
            success: true,
            stdout: (outputs.length ? outputs.join('\n') : '[Código executado sem output]') +
                    '\n\n✓ Execução concluída — INKU·AI Sandbox Python 3.11',
            stderr: ''
          });
        }
      }, 600 + Math.random() * 800);
    });
  }

  async getHistory(projectId, limit = 20) {
    const store = getStore();
    if (Array.isArray(store)) {
      return store.filter(e => e.project_id === projectId)
        .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit)
        .map(e => ({ ...e, code_snapshot: undefined }));
    }
    try {
      const Execution = require('../models/nosql/Execution.schema');
      return Execution.find({ project_id: projectId }).sort({ created_at: -1 }).limit(limit).select('-code_snapshot');
    } catch { return []; }
  }

  async getExecution(id) {
    const store = getStore();
    if (Array.isArray(store)) {
      const e = store.find(x => x._id === id);
      if (!e) throw new AppError('Execução não encontrada.', 404);
      return e;
    }
    const Execution = require('../models/nosql/Execution.schema');
    const e = await Execution.findById(id);
    if (!e) throw new AppError('Execução não encontrada.', 404);
    return e;
  }
}

module.exports = new SandboxService();
