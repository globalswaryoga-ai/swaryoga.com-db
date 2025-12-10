// Direct health endpoint - minimal working version
export default (req, res) => {
  const data = {
    status: 'OK',
    message: 'Backend API is running',
    timestamp: new Date().toISOString(),
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(200);
  res.write(JSON.stringify(data));
  res.end();
};
