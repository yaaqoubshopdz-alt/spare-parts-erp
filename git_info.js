const { execSync } = require('child_process');

try {
  console.log('=== GIT STATUS ===');
  const status = execSync('git status', { encoding: 'utf8' });
  console.log(status);
} catch (error) {
  console.error('Error running git status:', error.message);
  if (error.stdout) console.log('Stdout:', error.stdout);
  if (error.stderr) console.error('Stderr:', error.stderr);
}

try {
  console.log('\n=== GIT LOG ===');
  const log = execSync('git log -n 10 --oneline', { encoding: 'utf8' });
  console.log(log);
} catch (error) {
  console.error('Error running git log:', error.message);
  if (error.stdout) console.log('Stdout:', error.stdout);
  if (error.stderr) console.error('Stderr:', error.stderr);
}
