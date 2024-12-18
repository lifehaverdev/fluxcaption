import RunpodExecutor from './runpod-executor.mjs';
import dotenv from 'dotenv';
import logger from './utils/logger.mjs';

dotenv.config();

const usage = () => {
    console.log(`
Usage: node train.mjs <command> [options]

Commands:
    caption <trigger_word> <type>    Caption images in downloads folder
                                    type: 'subject' or 'style'
    
    train <model_name>              Train LoRA with existing captions
                                    model_name: name for your trained model

    full <trigger_word> <type> <model_name>    
                                    Run full pipeline: caption → train → upload

Examples:
    node train.mjs caption "man" "subject"
    node train.mjs train "my_character_v1"
    node train.mjs full "man" "subject" "my_character_v1"
`);
    process.exit(1);
};

const main = async () => {
    const args = process.argv.slice(2);
    if (args.length === 0) usage();

    logger.info('Starting training process');
    logger.info(`Command arguments: ${args.join(' ')}`);

    const executor = new RunpodExecutor();
    const command = args[0];

    try {
        switch (command) {
            case 'caption':
                if (args.length !== 3) usage();
                logger.step(`Starting caption process with trigger word: "${args[1]}" and type: "${args[2]}"`);
                await executor.execute(args[1], args[2], process.env.GITHUB_TOKEN);
                break;

            case 'train':
                if (args.length !== 2) usage();
                logger.step(`Starting training process for model: "${args[1]}"`);
                await executor.trainLora(args[1]);
                break;

            case 'full':
                if (args.length !== 4) usage();
                logger.step('Starting full pipeline');
                logger.info(`Parameters: trigger word="${args[1]}", type="${args[2]}", model="${args[3]}"`);
                await executor.execute(args[1], args[2], process.env.GITHUB_TOKEN);
                await executor.trainLora(args[3]);
                await executor.uploadToCloudflare(args[3]);
                break;

            default:
                usage();
        }
        logger.success('Process completed successfully');
    } catch (error) {
        logger.error('Process failed', error);
        process.exit(1);
    }
};

main(); 