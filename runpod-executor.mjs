import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from './utils/logger.mjs';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class RunpodExecutor {
    constructor() {
        this.gradioProcess = null;
        this.config = {
            workspacePath: '/workspace',
            joyCaptionPath: '/workspace/joy-caption-pre-alpha',
            datasetDownloadPath: '/workspace/downloads',
            configDatasetPath: '/workspace/training_data',
            loraOutputPath: '/workspace/lora_output',
            repoUrl: 'https://github.com/yourusername/joy-caption-pre-alpha.git',
            joyCaptionBranch: 'main'
        };
        logger.info('RunpodExecutor initialized with configuration:');
        logger.info(JSON.stringify(this.config, null, 2));
    }

    async executeCommand(command, options = {}) {
        logger.step(`Executing command: ${command}`);
        try {
            const { stdout, stderr } = await execAsync(command, options);
            if (stdout) logger.info(`Command output: ${stdout}`);
            if (stderr) logger.warning(`Command stderr: ${stderr}`);
            return { stdout, stderr };
        } catch (error) {
            logger.error(`Command execution failed: ${command}`, error);
            throw error;
        }
    }

    async setupGitCredentials(token) {
        if (token) {
            logger.step('Setting up Git credentials');
            try {
                await this.executeCommand(
                    `git config --global credential.helper store && echo "https://${token}@github.com" > ~/.git-credentials`
                );
                logger.success('Git credentials configured successfully');
            } catch (error) {
                logger.error('Failed to setup Git credentials', error);
                throw error;
            }
        }
    }

    async cloneRepository() {
        logger.step('Setting up repository...');
        try {
            const exists = await fs.access(this.config.joyCaptionPath)
                .then(() => true)
                .catch(() => false);

            if (exists) {
                logger.info('Repository directory already exists, pulling latest changes...');
                await this.executeCommand('git pull', { cwd: this.config.joyCaptionPath });
            } else {
                logger.info('Cloning repository...');
                const tokenizedUrl = this.config.repoUrl.replace(
                    'https://',
                    `https://oauth2:${process.env.GITHUB_TOKEN}@`
                );
                await this.executeCommand(
                    `git clone ${tokenizedUrl} ${this.config.joyCaptionPath} --branch ${this.config.joyCaptionBranch}`
                );
            }

            logger.step('Installing Python requirements...');
            await this.executeCommand(
                'pip install -r requirements.txt',
                { cwd: this.config.joyCaptionPath }
            );

            logger.success('Repository setup completed');
            return true;
        } catch (error) {
            logger.error('Failed to setup repository', error);
            throw error;
        }
    }

    async createDirectories() {
        logger.step('Creating necessary directories...');
        const directories = [
            this.config.datasetDownloadPath,
            this.config.configDatasetPath,
            this.config.loraOutputPath
        ];

        for (const dir of directories) {
            await fs.mkdir(dir, { recursive: true });
            logger.info(`Created directory: ${dir}`);
        }
    }

    async initialize(gitToken = null) {
        try {
            await this.createDirectories();
            if (gitToken) {
                await this.setupGitCredentials(gitToken);
            }
            await this.cloneRepository();
            logger.success('Initialization completed successfully');
        } catch (error) {
            logger.error('Initialization failed', error);
            throw error;
        }
    }

    async startGradioServer() {
        logger.step('Starting Gradio server...');
        
        return new Promise((resolve, reject) => {
            this.gradioProcess = spawn('python', ['app.py'], {
                cwd: this.config.joyCaptionPath
            });

            this.gradioProcess.stdout.on('data', (data) => {
                logger.info(`Gradio stdout: ${data}`);
                if (data.toString().includes('Running on local URL:')) {
                    logger.success('Gradio server is running');
                    resolve(true);
                }
            });

            this.gradioProcess.stderr.on('data', (data) => {
                logger.warning(`Gradio stderr: ${data}`);
            });

            this.gradioProcess.on('error', (error) => {
                logger.error(`Failed to start Gradio server`, error);
                reject(error);
            });

            setTimeout(() => {
                reject(new Error('Gradio server failed to start within timeout'));
            }, 30000);
        });
    }

    async captionDataset(triggerWord, type) {
        logger.step('Starting dataset captioning process...');
        try {
            // Ensure the output directory exists
            await fs.mkdir(this.config.configDatasetPath, { recursive: true });

            // Run the main.mjs script
            const command = `node main.mjs "${this.config.datasetDownloadPath}" "${this.config.configDatasetPath}" "${triggerWord}" "${type}"`;
            logger.step(`Executing command: ${command}`);
            
            const { stdout, stderr } = await execAsync(command);
            logger.info('Captioning stdout:', stdout);
            if (stderr) logger.warning('Captioning stderr:', stderr);

            return true;
        } catch (error) {
            logger.error('Error during captioning', error);
            throw error;
        }
    }

    async createConfig(/* parameters for config */) {
        // TODO: Implement config creation
        logger.info('Creating training configuration...');
    }

    async trainLora(/* training parameters */) {
        // TODO: Implement LoRA training
        logger.info('Starting LoRA training...');
    }

    async uploadToCloudflare(/* upload parameters */) {
        // TODO: Implement Cloudflare upload
        logger.info('Uploading to Cloudflare...');
    }

    async cleanup() {
        if (this.gradioProcess) {
            this.gradioProcess.kill();
            logger.info('Gradio server stopped');
        }
    }

    async execute(triggerWord, type, gitToken = null) {
        logger.info(`Starting execution with trigger word: "${triggerWord}" and type: "${type}"`);
        try {
            logger.step('Initialization phase');
            await this.initialize(gitToken);

            logger.step('Starting Gradio server');
            await this.startGradioServer();
            logger.success('Gradio server started successfully');

            logger.info('Waiting for server initialization...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            logger.step('Starting dataset captioning');
            await this.captionDataset(triggerWord, type);
            logger.success('Dataset captioning completed');

            await logger.summarize();
        } catch (error) {
            logger.error('Execution failed', error);
            throw error;
        } finally {
            logger.step('Cleaning up...');
            await this.cleanup();
            logger.info('Cleanup completed');
        }
    }
}

// Example usage with git token
const executor = new RunpodExecutor();
const gitToken = process.env.GITHUB_TOKEN; // Make sure to set this in your environment
executor.execute('example_trigger', 'subject', gitToken)
    .then(() => console.log('Execution completed'))
    .catch(error => console.error('Execution failed:', error));

export default RunpodExecutor;
