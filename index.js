var imgur = require('imgur-node-api');
var path = require('path');
var secrets = require('./secrets');
var SlackClient = require('slack-client');
var exec = require('child_process').exec;
var fs = require('fs');

var conf = {
    slackToken : secrets.slackToken,
    imgurKey : secrets.imgurKey,
    newCoffeeTrigger : 'Nu finns det nybryggt kaffe!',
    localImage : '/tmp/ourhero.jpg',
    //photoCommand : 'imagesnap -w 2.0' //mac os
    photoCommand : 'fswebcam -r 640x480 -S 20' //debian (r=resolution S=frames to skip, more light)
};

imgur.setClientID(conf.imgurKey);

var slackClient = new SlackClient(conf.slackToken);
var bot; // Track bot user .. for detecting messages by yourself

slackClient.on('loggedIn', function(user, team) {
    bot = user;
    console.log("Logged in as " + user.name + " of " + team.name + ", but not yet connected");
});

slackClient.on('open', function() {
    console.log('Connected');
});

slackClient.on('message', function(message) {
    if (message.user == bot.id) return; // Ignore bot's own messages
    if (!message.text || message.text.indexOf(conf.newCoffeeTrigger) == -1) return;

    //remove previous photo if exists
    try{
        fs.unlinkSync(conf.localImage);
    }catch (ex){
        console.log("failed to delete old photo. " + ex);
    }

    //execute os command to take photo
    exec(conf.photoCommand + ' ' + conf.localImage, function (error, stdout, stderr) {
        var channel = slackClient.getChannelGroupOrDMByID(message.channel);

        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
        if (error !== null) {
            console.log('exec error: ' + error);
            channel.send('Misslyckades att ta bild på vår hjälte: ' + error);
            return;
        }

        //upload it to imgur
        imgur.upload(conf.localImage, function (err, res) {
            if(err){
                console.log(err);
                channel.send('Kunde inte ladda upp bild på vår anonyme hjälte: ', err);
                return;
            }

            //link the imgur photo in a slack message
            console.log('Uploaded image to:' + res.data.link); // Log the imgur url
            channel.send('Ge en applåd till den som fyllde på! ' + res.data.link);
        });
    });
});

slackClient.login();