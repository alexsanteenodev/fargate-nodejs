const port = process.env.PORT || 3000;

console.log(`Application starting on port ${port}`);

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

console.log('Application ready');

