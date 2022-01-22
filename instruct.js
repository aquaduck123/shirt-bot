const axios = require("axios")
var badWords = require("./JSONs/badWords.json")
const config = require("./config.json")
var shirtinstruct_channel_ids = require("./JSONs/shirtinstruct.json")
function boldString(str, find) {
  var reg = new RegExp('(' + find + ')', 'gi');
  return str.replace(reg, '[slur removed]');
}
const bot = require("./index").bot
bot.on("messageCreate", async message => {


  if ((shirtinstruct_channel_ids.includes(message.channel.id) && !message.author.bot && !config.prefixes.includes(message.content.substring(0, 2)) || message.content.startsWith("--instruct"))) {
    if (message.content.startsWith("#") || message.system) return
    var prompt = message.content
    message.channel.sendTyping()
    if (message.content.startsWith("--instruct")) {
      prompt = message.content.substring(10, message.content.length)
    }
    let temp;
    if (message.content.includes("temperature=")) {
      try {
        let com = prompt.substring(prompt.indexOf("temperature=") + 12, prompt.indexOf("temperature=") + 15)
        temp = parseFloat(com)
        prompt = prompt.substring(0, prompt.indexOf("temperature=")) + prompt.substring(prompt.indexOf("temperature=") + 15, prompt.length)

      } catch (error) { console.error(error) }
    } else {
      temp = 0.7
    }

    let engine;
    switch (config["engine"]) {
      case "curie":
        engine = "curie-instruct-beta-v2"
        break
      case "davinci":
        engine = "davinci-instruct-beta-v3"
        break
      default:
        engine = "curie-instruct-beta-v2"
    }
    let data = await axios
      .post(`https://api.openai.com/v1/engines/${engine}/completions`,
        {
          prompt: prompt,
          temperature: temp,
          max_tokens: 512,
          top_p: 1,
          echo: true,
          frequency_penalty: 0,
          presence_penalty: 0
        }, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config["OPENAI_TOKEN"]}`,
          }
        })
    data = data.data

    var response = data.choices[0].text
    for (const word of badWords) {
      while (response.toLowerCase().includes(word)) {
        response = boldString(response, word)
      }
    }
    if (response.length > 2000) {

      for (var x = 0; x < (response.length / 2000) + 1; x++) {

        const reply = response.substring(x * 2000, (x + 1) * (2000) || response.length)
        console.log(reply)
        if (reply.length >= 1) { message.reply(reply) }
      }



    } else {

      message.reply(response)
    }
  }


})

