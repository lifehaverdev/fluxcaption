import fs from 'fs/promises';
import path from 'path';

class Logger {
    constructor() {
        this.logFile = path.join(process.cwd(), 'training.log');
        this.startTime = new Date();
    }

    async _writeToFile(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        await fs.appendFile(this.logFile, logMessage).catch(console.error);
    }

    info(message) {
        const formattedMessage = `[INFO] ${message}`;
        console.log('🔵', formattedMessage);
        this._writeToFile(formattedMessage);
    }

    success(message) {
        const formattedMessage = `[SUCCESS] ${message}`;
        console.log('✅', formattedMessage);
        this._writeToFile(formattedMessage);
    }

    error(message, error = null) {
        const formattedMessage = `[ERROR] ${message}`;
        console.error('❌', formattedMessage);
        if (error) {
            console.error(error);
            this._writeToFile(`${formattedMessage}\n${error.stack}`);
        } else {
            this._writeToFile(formattedMessage);
        }
    }

    warning(message) {
        const formattedMessage = `[WARNING] ${message}`;
        console.warn('⚠️', formattedMessage);
        this._writeToFile(formattedMessage);
    }

    step(message) {
        const formattedMessage = `[STEP] ${message}`;
        console.log('📍', formattedMessage);
        this._writeToFile(formattedMessage);
    }

    async summarize() {
        const endTime = new Date();
        const duration = (endTime - this.startTime) / 1000; // in seconds
        const summary = `
=================================
Training Session Summary
=================================
Start Time: ${this.startTime.toISOString()}
End Time: ${endTime.toISOString()}
Duration: ${duration} seconds
=================================`;
        
        console.log(summary);
        await this._writeToFile(summary);
    }
}

export default new Logger(); 