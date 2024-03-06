const { spawnSync } = require('child_process');
const storybookPath = './config/.storybook';

spawnSync(`npx storybook dev -c ${storybookPath} -p 6006`, { shell: true, stdio: 'inherit' });
