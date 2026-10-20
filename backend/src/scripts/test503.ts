import axios from 'axios';

async function test503() {
  console.log('Sending POST /api/batches with ML Service offline...');
  try {
    const res = await axios.post('http://localhost:5000/api/batches', {
      factory_id: 'Factory_A',
      region: 'Low-Country',
      green_leaf_input_kg: 5000,
      withering_duration_hrs: 16,
      dryer_temperature_c: 100,
      machine_downtime_hrs: 0,
      plucking_fine_leaf_pct: 85,
      relative_humidity_pct: 70,
      ambient_temperature_c: 25,
      tea_grade_produced: 'BOP',
    });
    console.log('UNEXPECTED SUCCESS (Should have failed with 503):', res.status);
  } catch (err: any) {
    if (err.response) {
      console.log('Received expected response from backend error handler:');
      console.log('HTTP Status Code:', err.response.status);
      console.log('Response Payload:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Request failed without response (Node server might be down):', err.message);
    }
  }
}

test503();
