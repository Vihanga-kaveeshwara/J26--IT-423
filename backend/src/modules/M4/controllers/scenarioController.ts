import { Request, Response } from 'express';
import { scenarioService } from '../services/scenarioService';

export function listScenariosController(_req: Request, res: Response): void {
  const scenarios = scenarioService.listScenarios();
  res.json({
    success: true,
    scenarios,
  });
}

export function getScenarioByIdController(req: Request, res: Response): void {
  const id = String(req.params.id);
  const scenario = scenarioService.getScenarioById(id);
  if (!scenario) {
    res.status(404).json({ success: false, message: 'Scenario not found' });
    return;
  }
  res.json({
    success: true,
    scenario,
  });
}

export function createScenarioController(req: Request, res: Response): void {
  const body = req.body;
  if (!body.name) {
    res.status(400).json({ success: false, message: 'Scenario name is required' });
    return;
  }

  const scenario = scenarioService.createScenario(body);
  res.status(201).json({
    success: true,
    message: 'Scenario created successfully',
    scenario,
  });
}

export function updateScenarioController(req: Request, res: Response): void {
  const id = String(req.params.id);
  const updated = scenarioService.updateScenario(id, req.body);
  if (!updated) {
    res.status(404).json({ success: false, message: 'Scenario not found for update' });
    return;
  }
  res.json({
    success: true,
    message: 'Scenario updated successfully',
    scenario: updated,
  });
}

export function deleteScenarioController(req: Request, res: Response): void {
  const id = String(req.params.id);
  const success = scenarioService.deleteScenario(id);
  if (!success) {
    res.status(404).json({ success: false, message: 'Scenario not found for deletion' });
    return;
  }
  res.json({
    success: true,
    message: 'Scenario deleted successfully',
  });
}
