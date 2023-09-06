// // https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-started.html

// const { SecretsManagerClient,GetSecretValueCommand }  = require('@aws-sdk/client-secrets-manager')
//   const secret_name = "test-secret";
  
//   const client = new SecretsManagerClient({
//     region: "ap-south-1",
//   });
  
//   let response;
  
//   try {
//     response = client.send(
//       new GetSecretValueCommand({
//         SecretId: secret_name,
//         VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
//       })
//     );
//   } catch (error) {
//     // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
//     throw error;
//   }
  
//   const secret = response.SecretString;
  
//   module.exports=secret

//   // Your code goes here

const AWS = require('aws-sdk');

AWS.config.update({ region: "ap-south-1" });

// Create an AWS Secrets Manager client
const secretsManager = new AWS.SecretsManager();

// Define the name of the secret you want to retrieve
const secretName = "test-secret";

// Define a function to retrieve the secret
async function getSecret() {
  try {
    const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
    const secretString = data.SecretString;

    // Parse the secret string (JSON or any other format)
    const secretData = JSON.parse(secretString);

    // Now, you can use the secret data
    console.log('Retrieved secret data:', secretData);
  } catch (error) {
    console.error('Error retrieving secret:', error);
  }
}

// Call the function to retrieve the secret
const x=getSecret();
console.log(x)
