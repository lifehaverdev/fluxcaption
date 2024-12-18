import fs from 'fs';
import path from 'path';
import { Client } from '@gradio/client'; // Import the Gradio Client
import OpenAI from "openai"; // Default import for OpenAI in ES module
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_SECRET, // Your OpenAI API key from the environment variables
});

// At the top of the file, after the imports
const DEFAULT_GRADIO_URL = "http://127.0.0.1:7860/";

// Get the Hugging Face token from the .env file
const hfToken = process.env.HF;
//console.log(hfToken)

// Function to log messages at different stages
const log = (message) => {
  console.log(`[LOG] ${message}`);
};

// Sleep function to add a delay between API calls
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


// Function to convert local image to Buffer
const imageToBuffer = (imagePath) => {
  const fileBuffer = fs.readFileSync(imagePath);
  log(`Converted image at ${imagePath} to buffer`);
  return fileBuffer; // Return the buffer directly
};

// Function to connect to Gradio and process the image using Gradio Client
const processImageWithClient = async (imageBuffer, imageFileName, gradioUrl = DEFAULT_GRADIO_URL) => {
  try {
    // Connect to the Gradio app using the Client and the Hugging Face token
    const client = await Client.connect(gradioUrl, { hf_token: hfToken });

    log(`Connected to Gradio app for image: ${imageFileName}`);

    // Send the image buffer to the Gradio app
    const result = await client.predict("/stream_chat", [
      imageBuffer, // Send image as Buffer
    ]);

    log(`Prediction result for ${imageFileName}: ${result.data}`);

    // Convert the result to a string (in case it's an array)
    const resultText = Array.isArray(result.data) ? result.data.join('\n') : result.data;

    return resultText; // Return the result of the prediction as a string
  } catch (error) {
    log(`Error processing image with Gradio Client: ${error.message}`);
    return null;
  }
};

// Function to process images based on mode (Flux or SDXL)
const processImages = async (inputFolder, outputFolder, word, type, mode) => {
  log(`${mode}`);
  try {
    const files = fs.readdirSync(inputFolder);
    log(`Found ${files.length} files in folder ${inputFolder}`);

    const imageFiles = files.filter((file) => file.endsWith('.png') || file.endsWith('.jpg'));
    log(`Filtered ${imageFiles.length} image files`);

    for (const imageFile of imageFiles) {
      
      const imagePath = path.join(inputFolder, imageFile);
      const outputTextFilePath = path.join(outputFolder, `${path.parse(imageFile).name}.txt`); //.txt usually
      
      // Ensure the output folder exists
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
        log(`Created output folder: ${outputFolder}`);
      }

      // Flux Mode (skip Gradio, refine existing text file)
      if (mode == 'flux') {
        
        if (!fs.existsSync(outputTextFilePath)) {
          log(`Text file for ${imageFile} does not exist in the flux dataset, skipping.`);
          continue;
        }

        const existingText = fs.readFileSync(outputTextFilePath, 'utf-8');

        const refinedText = await refineWithOpenAI(word, existingText, type);
        if (refinedText) {
          fs.writeFileSync(outputTextFilePath, refinedText);
          log(`Updated final refined result for ${imageFile} to ${outputTextFilePath}`);
        } else {
          log(`File not refined for ${imageFile}. Skipping.`);
        }

        await sleep(60000); // Enforce 10-second delay between requests

      // SDXL Mode (process through Gradio first)
      } else if (mode == 'sdxl') {
        if (fs.existsSync(outputTextFilePath)) {
          log(`Text file already exists for ${imageFile}, skipping.`);
          continue;
        }

        const imageBuffer = fs.readFileSync(imagePath);
        const resultText = await processImageWithClient(imageBuffer, imageFile);

        if (!resultText) {
          log(`Failed to process image: ${imageFile}. Skipping.`);
          continue;
        }

        const refinedText = await refineWithOpenAI(word, resultText, type);
        if (refinedText) {
          fs.writeFileSync(outputTextFilePath, refinedText);
          log(`Updated final refined result for ${imageFile} to ${outputTextFilePath}`);
        }

        await sleep(60000); // Enforce 10-second delay between requests
      }
    }

    log('All images processed successfully.');
  } catch (error) {
    log(`Error processing images: ${error}`);
  }
};

// Function to refine text with OpenAI and handle rate limiting with retries
const refineWithOpenAI = async (triggerWord, rawCaption, type) => {
  try {
    let prompt = `I am providing a text file. The trigger word is "${triggerWord}". `;

    if (type === 'subject') {
      prompt += `The trigger word refers to a character or subject in the image, such as "man", "boy", "figure". Your task is to replace appropriate subject-related words with the trigger word. `;
    } else if (type === 'style') {
      prompt += `The trigger word refers to the artistic style of the image. Your task is to insert the trigger word where it makes sense, especially in references to the overall style, textures, or aesthetic elements. `;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { "role": "user", "content": prompt + '\n\n' + rawCaption }
      ],
      max_tokens: 1000
    });

    return completion.choices[0].message.content.trim();
    
  } catch (error) {
    if (error.response && error.response.status === 429) {
      const retryAfter = parseFloat(error.response.headers['retry-after']) || 60; // Wait for 60 seconds by default
      console.error(`Rate limit reached. Retrying after ${retryAfter} seconds...`);
      await sleep(retryAfter * 1000); // Convert seconds to milliseconds
      return await refineWithOpenAI(triggerWord, rawCaption, type); // Retry the request after sleep
    }

    console.error(`Error refining text with OpenAI: ${error.message}`);
    return null; // Return null for unprocessed files
  }
};

// Add error handling for missing environment variables
if (!process.env.OPENAI_SECRET || !process.env.HF) {
  throw new Error('Required environment variables OPENAI_SECRET and HF must be set');
}

// Main function to handle command-line arguments
const main = async () => {
  const args = process.argv.slice(2);

  if (args.length !== 4) {
    console.error('Usage: node main.mjs <inputFolder> <outputFolder> <WORD> <MODE>');
    process.exit(1);
  }

  const inputFolder = args[0];
  const outputFolder = args[1];
  const word = args[2];
  const type = args[3];
  let mode;
  if(inputFolder == outputFolder) {
    mode = 'flux'
  } else {
    mode = 'sdxl'
  }
  //const mode = args[3]; // Either 'flux' or 'sdxl'

  if (mode !== 'flux' && mode !== 'sdxl') {
    console.error('Error: The <MODE> argument must be either "flux" or "sdxl".');
    process.exit(1);
  }
  console.log('mode',mode)
  await processImages(inputFolder, outputFolder, word, type, mode);
  // const processImages = async (inputFolder, outputFolder, word, type, mode) => {
};

// Execute the main function
main();

