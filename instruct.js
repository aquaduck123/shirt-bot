const querystring = require('querystring');
const https = require('https')
var badWords = require("./JSONs/badWords.json")
const config = require("./config.json")
const OPENAI_KEY = config["OPENAI_KEY"]
var shirtinstruct_channel_ids = require("./JSONs/shirtinstruct.json")

function boldString(str, find) {
  var reg = new RegExp('(' + find + ')', 'gi');
  return str.replace(reg, '[slur removed]');
}
const fs = require('fs');

const Discord = require('discord.js');
const { Client, Intents, Collection, MessageActionRow, MessageButton, MessageEmbed, MessageCollector, ButtonInteraction, MessageSelectMenu, MessageAttachment, ContextMenuInteraction } = require('discord.js');
const bot = new Client({ intents: 32767 });
bot.on("messageCreate", async message => {
  
  if ((shirtinstruct_channel_ids.includes(message.channel.id) && !message.author.bot&&!config.prefixes.includes(message.content.substring(0,2))||message.content.startsWith("--instruct"))) {
    var prompt = message.content
    if (message.content.startsWith("--instruct")){
     prompt = message.content.substring(10, message.content.length)
    }
    const data = JSON.stringify({

      prompt: prompt,
      temperature: 0.7,
      max_tokens: 1028,
      top_p: 1,
      echo: true,
      frequency_penalty: 0,
      presence_penalty: 0
    })
    let engine;
    switch(config["engine"]){
      case "curie":
      engine = "curie-instruct-beta-v2"
      break
      case "davinci":
      engine = "davinci-instruct-beta-v3"
      break
    }
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: `/v1/engines/${engine}/completions`,
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config["OPENAI_KEY"]}`,
      }
    }

    const req = https.request(options, res => {
 
      var data = ""
      res.on('data', d => {

        data += d;
      })
      res.on("end", () => {

        data = JSON.parse(data)
        var response = data.choices[0].text
        for (const word of badWords) {
          while (response.toLowerCase().includes(word)) {
            response = boldString(response, word)
          }
        }
        console.log(response)
        if (response.length > 2000) {

          for (var x = 0; x < (response.length / 2000) + 1; x++) {
      
            const reply = response.substring(x * 2000, (x + 1) * (2000) || response.length)
                  console.log(reply)
            if (reply.length >= 1) { message.reply(reply) }
          }



        } else {

          message.reply(response)
        }

      })
    })

    req.on('error', error => {
      console.error(error)
    })


    req.write(data)
    req.end()
  } else if (message.content.startsWith("!complete") && !message.author.bot) {
    var prompt = message.content.substring(10, message.content.length)
    const data = JSON.stringify({

      prompt: prompt,
      temperature: 0.7,
      max_tokens: 500,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    })
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/engines/davinci/completions',
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config["OPENAI_KEY"]}`,
      }
    }

    const req = https.request(options, res => {
     
      var data = ""
      res.on('data', d => {
        process.stdout.write(d)
        data += d;
      })
      res.on("end", () => {

        data = JSON.parse(data)
        var response = prompt + data.choices[0].text
        for (const word of badWords) {
          while (response.toLowerCase().includes(word)) {
            response = boldString(response, word)
          }
        }
        if (response.length > 2000) {

          for (var x = 0; x < (response.length / 2000) + 1; x++) {
            const reply = response.substring(x * 2000, (x + 1) * (2000) || response.length)
            if (reply.length >= 1) { message.reply(reply) }
          }



        } else {

          message.reply(response)
        }
      })
    })

    req.on('error', error => {
      console.error(error)
    })


    req.write(data)
    req.end()
  }

})

bot.login(config["BOT_TOKEN"])