// api/health.js — 健康检查
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    time: new Date().toISOString(),
    redis: !!process.env.UPSTASH_REDIS_REST_URL,
  });
}
