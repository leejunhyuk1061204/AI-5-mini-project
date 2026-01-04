const concurrently = require('concurrently');
const path = require('path');

const isWin = process.platform === 'win32';

console.log(`🚀 Starting Development Server...`);
console.log(`Detected OS: ${isWin ? 'Windows' : 'macOS/Linux'}`);

// Define commands based on OS
const backendCmd = isWin
    ? 'cd backend && gradlew.bat bootRun --args="--spring.profiles.active=local"'
    : 'cd backend && ./gradlew bootRun --args="--spring.profiles.active=local"';

// Windows usually uses 'python', Mac/Linux usually 'python3'
const pythonCmd = isWin ? 'python' : 'python3';
const aiCmd = `cd ai && ${pythonCmd} -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload`;

const frontendCmd = 'cd frontend && npm run dev';

const { result } = concurrently(
    [
        { command: backendCmd, name: 'backend', prefixColor: 'blue' },
        { command: aiCmd, name: 'ai', prefixColor: 'green' },
        { command: frontendCmd, name: 'frontend', prefixColor: 'magenta' }
    ],
    {
        prefix: 'name',
        killOthers: ['failure', 'success'],
        restartTries: 0,
    }
);

result.then(
    () => console.log('All processes finished successfully'),
    (err) => {
        console.error('Error occurred in one of the processes');
        // process.exit(1); // Optional: let user see output
    }
);
