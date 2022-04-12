const WebSocket = require("ws")
const express = require("express")
const app = express();
const server = require("http").createServer(app)
const path = require("path")
const mulaw = require("mulaw-js")
const base64 = require("js-base64")
const wss = new WebSocket.Server({ server })
const WaveFile = require("wavefile").WaveFile

//Include Azure Speech service 
const sdk = require("microsoft-cognitiveservices-speech-sdk")
const subscriptionKey = "9982324b82df4aae871251b3d19b7d58"
const serviceRegion = "southeastasia"
const language = "en-US"

const azurePusher = sdk.AudioInputStream.createPushStream(sdk.AudioStreamFormat.getWaveFormatPCM(8000, 16, 1))
const audioConfig = sdk.AudioConfig.fromStreamInput(azurePusher);
const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey,serviceRegion);

speechConfig.speechRecognitionLanguage = language;
const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

var chunks = []
recognizer.recognizeOnceAsync(
  result =>
  {
      console.log(result);
      recognizer.close();
  },
  error =>
  {
      console.log(err);
      recognizer.close();
  });
// Handle Web Socket Connection
wss.on("connection", function connection(ws) {
console.log("New Connection Initiated");

   ws.on("message", function incoming(message) {
    const msg = JSON.parse(message);
    switch (msg.event) {
      case "connected":
        console.log(`A new call has connected.`);

        // Code to send the transcript over the browser 
        wss.clients.forEach(client => {
          if(client.readyState === WebSocket.OPEN){
              client.send(
                  JSON.stringify({
                      event:"interim-transcription",
                      Text: msg
                  })
              )
          }
      })
        break;
      case "start":
        console.log(`Starting Media Stream ${msg.streamSid}`);
        break;
      case "media":
        //console.log(`Receiving Audio...`)
        // Create stream to the Azure Speech to text API
        // process.stdout.write(msg.media.payload + " " + " bytes\033[0G");
        // streampayload = base64.decode(msg.media.payload);
        // var data = Buffer.from(streampayload, 'utf-8');
        // azurePusher.write(mulaw.decode(data));


        // const twilioData = msg.media.payload
        // let wav = new WaveFile()
        // wav.fromScratch(1, 8000, "8m", Buffer.from(twilioData, "utf-8"))
        // wav.fromMuLaw()
        // const twilio64Encoded = wav.toDataURI().split("base64,")[1]
        // const twilioAudioBuffer = Buffer.from(twilio64Encoded, "base64")
        // chunks.push(twilioAudioBuffer.slice(44))
        // if(chunks.length >= 5){
        //   const audioBuffer = Buffer.concat(chunks)
        //   const encodedAudio = audioBuffer.toString("base64")
        //   azurePusher.write(mulaw.decode(encodedAudio));
        //   chunks =[]
        // }
        break;
      case "stop":
        console.log(`Call Has Ended`);
        azurePusher.close()
        recognizer.stopContinuousRecognitionAsync()
        break;
    }
  });

})

//Handle HTTP Request
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "/index.html")))

app.post("/", (req, res) => {
  res.set("Content-Type", "text/xml");

  res.send(
    `<Response>
       <Start>
           <Stream url="wss://${req.headers.host}" />
       </Start>
       <Say>
            Start speaking to see your audio transcribed in the console
       </Say>
       <Pause legnth ='60' />
    </Response>`
)
});

console.log("Listening at Port 8080");
server.listen(8080);
