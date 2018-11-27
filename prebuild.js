const argv = require('minimist')(process.argv.slice(2));
const path = require('path');
const { spawn } = require('child_process');
const fse = require('fs-extra');

const target = argv.target || process.versions.node;
const platform = process.platform;
const arch = argv.arch || process.arch;
const targetElectron = Boolean(argv.electron || false);

console.log(`Building for ${JSON.stringify({
    target,
    platform,
    arch,
    electron: targetElectron,
})}`);

const nodeGypPath = path.join(__dirname, 'node_modules/node-gyp/bin/node-gyp');

const versionTargetParts = [
    `platform-${platform}`,
    `arch-${arch}`,
    `${targetElectron ? 'electron' : 'node'}-${target.split('.').slice(0, 2).join('.')}`,
];

const prebuildModulesDir = path.join(__dirname, 'prebuilt-modules');
const prebuildModulesTargetDir = path.join(prebuildModulesDir, versionTargetParts.join('-'));

console.log(`Target version dir "${versionTargetParts.join('-')}"`);

/**
 * @param {string} command
 * @param {string[]} [args]
 * @param {{}} [options]
 * @return {Promise}
 */
function executeCommand(command, args = [], options = {}) {
    return new Promise(resolve => {
        const ps = spawn(command, args, options);

        ps.stdout.on('data', (data) => {
            console.log(`${data}`);
        });

        ps.stderr.on('data', (data) => {
            console.error(`${data}`);
        });

        ps.on('close', code => {
            if (code > 0) {
                console.error(`Command "${command} ${args.join(' ')}" failed with exit code ${code}`);
                process.exit(code);
            }

            resolve();
        });
    });
}

const modulesToPrebuild = [
    'pi-spi',
    'microtime',
];

(async function main() {
    // ensure prebuilt modules target dir is created
    await fse.ensureDir(prebuildModulesTargetDir);

    for (let module of modulesToPrebuild) {
        // rebuilt module with node gyp for specified target
        const nodeGypArgs = [
            nodeGypPath,
            'rebuild',
            `--target=${target}`,
            `--arch=${arch}`,
        ];

        if (targetElectron) {
            nodeGypArgs.push('--dist-url=https://atom.io/download/electron');
        }

        await executeCommand('node', nodeGypArgs, {
            cwd: path.join(__dirname, 'node_modules', module),
        });

        console.log(`Module ${module} rebuilt`);

        // remove old prebuilt module from prebuilt modules target dir
        await fse.remove(path.join(prebuildModulesTargetDir, module));

        // copy newly rebuilt version to prebuilt modules target dir
        await fse.copy(
            path.join(__dirname, 'node_modules', module),
            path.join(prebuildModulesTargetDir, module)
        );

        console.log(`Module ${module} copied to prebuilt-modules`);
    }
})();