const { expect } = require('chai');
const execa = require('execa');

describe('lcap', () => {
    it('init', async () => {
        const { stdout } = await execa.sync('node', ['./bin/lcap', 'init', 'component', 'custom-button']);
        expect(stdout.includes('Please input a title')).to.be.true;
    });
});
