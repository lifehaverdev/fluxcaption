import fs from 'fs';
import path from 'path';
import { Client } from '@gradio/client'; // Import the Gradio Client
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get the Hugging Face token from the .env file
const hfToken = process.env.HF;
console.log(hfToken)

// Function to log messages at different stages
const log = (message) => {
  console.log(`[LOG] ${message}`);
};

// Function to convert local image to Buffer
const imageToBuffer = (imagePath) => {
  const fileBuffer = fs.readFileSync(imagePath);
  log(`Converted image at ${imagePath} to buffer`);
  return fileBuffer; // Return the buffer directly
};

// Function to connect to Gradio and process the image using Gradio Client
const processImageWithClient = async (imageBuffer, imageFileName) => {
  try {
    // Connect to the Gradio app using the Client and the Hugging Face token
    const client = await Client.connect("http://127.0.0.1:7860/", { hf_token: hfToken });

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

// Function to process images one by one, ensuring success before moving to the next
const processImages = async (inputFolder, outputFolder, word) => {
  try {
    // Read all files from the input folder
    const files = fs.readdirSync(inputFolder);
    log(`Found ${files.length} files in folder ${inputFolder}`);

    // Filter only image files (assuming .png and .jpg)
    const imageFiles = files.filter((file) => file.endsWith('.png') || file.endsWith('.jpg'));
    log(`Filtered ${imageFiles.length} image files`);

    // Process each image file one by one
    for (const imageFile of imageFiles) {
      const imagePath = path.join(inputFolder, imageFile);
      const outputTextFilePath = path.join(outputFolder, `${path.parse(imageFile).name}.txt`);

      // Check if the .txt file already exists in the output folder
      if (fs.existsSync(outputTextFilePath)) {
        log(`Text file already exists for ${imageFile}, skipping.`);
        continue; // Skip this image if the .txt file exists
      }

      const imageBuffer = imageToBuffer(imagePath); // Convert the image to a buffer

      // Process this image with the Gradio client
      const resultText = await processImageWithClient(imageBuffer, imageFile);

      // If resultText is null, skip this file and continue with the next
      if (!resultText) {
        log(`Failed to process image: ${imageFile}. Continuing to the next image.`);
        continue;
      }

      // Prepend the word to the resultText
      const finalText = `${word} ${resultText}`;

      // Ensure the output folder exists
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }

      // Clone the image to the output folder
      const outputImagePath = path.join(outputFolder, imageFile);
      fs.copyFileSync(imagePath, outputImagePath);
      log(`Copied image to ${outputImagePath}`);

      // Write the result to a text file with the same name as the image
      fs.writeFileSync(outputTextFilePath, finalText); // Write the prediction result with the word
      log(`Saved result to ${outputTextFilePath}`);
    }

    log('All images processed successfully.');
  } catch (error) {
    log(`Error processing images: ${error}`);
  }
};

// Main function to handle command-line arguments
const main = async () => {
  const args = process.argv.slice(2); // Get command-line arguments

  if (args.length !== 3) {
    console.error('Usage: node main.mjs <inputFolder> <outputFolder> <WORD>');
    process.exit(1);
  }

  const inputFolder = args[0];
  const outputFolder = args[1];
  const word = args[2]; // Get the word argument

  // Check if input folder exists
  if (!fs.existsSync(inputFolder)) {
    console.error(`Error: Input folder "${inputFolder}" does not exist.`);
    process.exit(1);
  }

  // Process the images
  await processImages(inputFolder, outputFolder, word);
};

// Execute the main function
main();
