import axios from 'axios';
import { config } from '../config/env';

export async function checkMLServiceHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${config.mlServiceUrl}/api/ml/health`, {
      timeout: 3000,
    });
    return response.data?.success === true;
  } catch (error) {
    console.warn('ML service health check unavailable', error);
    return false;
  }
}
