var imgur = require('imgur-node-api');
var path = require('path');
var secrets = require('./secrets');
var SlackClient = require('slack-client');
var sys = require('sys');
var exec = require('child_process').exec;
var fs = require('fs');

var conf = {
    slackToken : secrets.slackToken,
    imgurKey : secrets.imgurKey,
    newCoffeeTrigger : 'Nu finns det nybryggt kaffe!',
    thankYouText: 'Ge en applåd till den som fyllde på! ',
    localImage : '/tmp/ourhero.jpg',
    //photoCommand : 'imagesnap -w 2.0 ' //should be replaced if on a raspberry with the equivalent command
    photoCommand : 'fswebcam 640x480 ' //should be replaced if on a raspberry with the equivalent command
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

    try{
        fs.unlinkSync(conf.localImage);
    }catch (ex){
        console.log("failed to delete old photo. " + ex);
    }

    exec(conf.photoCommand + conf.localImage, function (error, stdout, stderr) {
        sys.print('stdout: ' + stdout);
        sys.print('stderr: ' + stderr);
        if (error !== null) {
            console.log('exec error: ' + error);
            return;
        }

        var channel = slackClient.getChannelGroupOrDMByID(message.channel);

        imgur.upload(conf.localImage, function (err, res) {
            if(err){
                console.log(err);
                return;
            }

            console.log('Uploaded image to:' + res.data.link); // Log the imgur url
            channel.send(conf.thankYouText + res.data.link);
        });
    });
});

slackClient.login();