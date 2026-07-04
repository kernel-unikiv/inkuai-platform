'use strict';
const aiSuggest = require('../services/ai.suggest.service');
const { ApiResponse } = require('../utils/apiResponse');

class AISuggestController {
  async suggestField(req, res, next) {
    try {
      const result = await aiSuggest.suggestField(req.body);
      return ApiResponse.success(res, result);
    } catch(e) { next(e); }
  }
  async fillForm(req, res, next) {
    try {
      const result = await aiSuggest.fillForm(req.body);
      return ApiResponse.success(res, result);
    } catch(e) { next(e); }
  }
  async summarize(req, res, next) {
    try {
      const { text, maxWords } = req.body;
      const summary = await aiSuggest.summarizeText(text, maxWords);
      return ApiResponse.success(res, { summary });
    } catch(e) { next(e); }
  }
}
module.exports = new AISuggestController();
