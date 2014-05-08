$(function(){

    var defaultCommitMessage = "commit from scratchpad"

    var firebase_url = 'https://my-scratchpad.firebaseio.com/';

    document.getElementById('fetch-github-tags').addEventListener('click', function () {
        $(document.body).addClass('spinner')
        editor.setReadOnly(true)
        process_github_tags()
            .then(function () {
                editor.setReadOnly(false)
                $(document.body).removeClass('spinner')
            })
            .fail(function () {
                $(document.body).removeClass('spinner')

            })
            .done()
    })

  if (window.document.location.hash === '') {
    window.document.location.hash = 'red-ticket-3574';
  }

  var Scratchpad = {document_id:window.document.location.hash.replace('#','') }

  window.addEventListener('hashchange', function () {
    window.location.reload()
  })

  // Scratchpad Intro
  //--------------------------------------------------------------------------------
  var intro = ['<style>',
'  body {',
'  padding-top: 80px;',
'  text-align: center;',
'  font-family: monaco, monospace;',
'  background: url(http://media.giphy.com/media/Jrd9E2kuPuOYM/giphy.gif) 50%;',
'  background-size: cover;',
'}',
'h1, h2 {',
'  display: inline-block;',
'  background: #fff;',
'}',
'h1 {',
  '  font-size: 30px',
'}',
'h2 {',
'  font-size: 20px;',
'}',
'span {',
'  background: #fd0;',
'}',
'</style>',
'<h1>Welcome to <span>scratchpad.io</span></h1><br>',
'<h2>(a realtime html, css + now javascript editor)</h2>'].join('\n');

    //grossly ugly - where's backbone when u need it? :)

    githubStuff = document.querySelector('#github-stuff')
    rollingGithubInputsContainer = document.querySelectorAll('#rolling-github-inputs')
    rollingGithubInputs = document.querySelectorAll('#rolling-github-inputs input')

    var rollingGithubInputsOffset = 0;
    var rollingGithubInputsOffsetFactor=25;
    var rollingGithubInputsIndex = 0;


    //so grossssss -- object observers would be so much better a la object.watch

    function reprocessUpDownArrows() {
        if (rollingGithubInputsIndex===0) {
            $(githubStuff).removeClass('downable')
        }
        else {
            $(githubStuff).addClass('downable')
        }

        if (rollingGithubInputsIndex==rollingGithubInputs.length-1) {
            $(githubStuff).removeClass('uppable')
        }
        else {
            $(githubStuff).addClass('uppable')
        }

    }

    reprocessUpDownArrows()

    for (i=0; i<rollingGithubInputs.length;i++) {
        rollingGithubInputs[i].addEventListener('keyup', function(event) {

            if (event.keyCode === 38) {//up
                if (rollingGithubInputsIndex==rollingGithubInputs.length-1) {
                    return
                }
                rollingGithubInputsIndex+=1

                rollingGithubInputsOffset -= rollingGithubInputsOffsetFactor
                $(rollingGithubInputsContainer).css('-webkit-transform', 'translateY(' + rollingGithubInputsOffset + 'px)')

                reprocessUpDownArrows()

            }
            else if (event.keyCode === 40) { //down
                if (rollingGithubInputsIndex==0) {
                    return
                }
                rollingGithubInputsIndex-=1
                rollingGithubInputsOffset += rollingGithubInputsOffsetFactor
                $(rollingGithubInputsContainer).css('-webkit-transform', 'translateY(' + rollingGithubInputsOffset + 'px)')

                reprocessUpDownArrows()
            }

        })
    }

    var github_email, github_personal_access_token, github_name;


    document.querySelector('input#github-personal-access-token').addEventListener('change', function (event) {
        localStorage.setItem('github_personal_access_token', document.querySelector('input#github-personal-access-token').value)
    })

    if (localStorage.getItem('github_personal_access_token')) {
        document.querySelector('input#github-personal-access-token').value = localStorage.getItem('github_personal_access_token')
    }

    document.querySelector('input#github-email').addEventListener('change', function (event) {
        localStorage.setItem('github_email', document.querySelector('input#github-email').value)
    })

    if (localStorage.getItem('github_email')) {
        document.querySelector('input#github-email').value = localStorage.getItem('github_email')
    }

    document.querySelector('input#github-name').addEventListener('change', function (event) {
        localStorage.setItem('github_name', document.querySelector('input#github-name').value)
    })

    if (localStorage.getItem('github_name')) {
        document.querySelector('input#github-name').value = localStorage.getItem('github_name')
    }


    document.querySelector('input#github-next-commit-message').addEventListener('change', function (event) {
        localStorage.setItem('github_next_commit_message', document.querySelector('input#github-next-commit-message').value)
    })

    if (localStorage.getItem('github_next_commit_message')) {
        document.querySelector('input#github-next-commit-message').value = localStorage.getItem('github_next_commit_message')
    }





  // Ace code edtor
  //--------------------------------------------------------------------------------
  window.editor = ace.edit("editor");
  //new TokenTooltip(window.editor)

  ace.require("ace/ext/language_tools");
  editor.setOptions({
    enableBasicAutocompletion: true,
    enableSnippets: true
  });

  editor.setTheme("ace/theme/tomorrow_night_eighties");
  editor.getSession().setMode("ace/mode/html");
  editor.setHighlightActiveLine(false);
  editor.getSession().setTabSize(2);
  document.getElementById('editor').style.fontSize='11px';
  editor.commands.removeCommand('gotoline');
  editor.setShowPrintMargin(false);
  editor.commands.addCommand({
    name: 'showHelp',
    bindKey: {win: 'Ctrl-/',  mac: 'Command-/'},
    exec: function(editor) {
        $('#help').toggleClass('visible');
    }
  });
  editor.commands.addCommand({
    name: 'toggleFullscreen',
    bindKey: {win: 'Ctrl-i',  mac: 'Command-i'},
    exec: function(editor) {
        toggleFullscreen();
    }
  });

  // Set up iframe.
  var iframe = document.getElementById('preview'),
    iframedoc = iframe.contentDocument || iframe.contentWindow.document;
  iframedoc.body.setAttribute('tabindex', 0);

  // Base firebase ref
  //--------------------------------------------------------------------------------
  var scratchpadRef = new Firebase(firebase_url + Scratchpad.document_id);
  var now = new Date();
  scratchpadRef.child('updatedAt').set(now.toString());


  // Multiple client stuff
  //--------------------------------------------------------------------------------

  // Push a new child to clients that kills itself on disconnect
  var thisClientRef = scratchpadRef.child('clients').push('idle');
  thisClientRef.onDisconnect().remove()

  // Keep track of the number of active connections
  scratchpadRef.child('clients').on('value', function(dataSnapshot){

    if (dataSnapshot.val() === null) {
      scratchpadRef.child('clients').set({});
    } else {

      var numClients = dataSnapshot.numChildren();

      // Label the tooltip appropriately
      $('#connections-tooltip').remove();
      if (numClients === 2) {
        $('#connections').after('<span id="connections-tooltip"> 1 other viewer</span>');
      } else if (numClients === 1) {
        // do nothing
      } else {
        $('#connections').after('<span id="connections-tooltip"> '+ (numClients - 1) + ' other viewers</span>');
      }

      // Append proper number of dots
      $('#connections').html('');
      for (i = 1; i < dataSnapshot.numChildren(); i++) {
        $('#connections').append('<li>&nbsp;</li>');
      }

    }

  });

  $('#connections').hover(function(){
    $('#connections-tooltip').css('opacity', 1);
  }, function(){
    $('#connections-tooltip').css('opacity', 0);
  });


  // Code Editing
  //--------------------------------------------------------------------------------
  var scratchpadEditorRef = scratchpadRef.child('editor');

  scratchpadRef.once('value', function(dataSnapshot) {
    if ( dataSnapshot.child('editor').val() === null ) {
        console.log('changin!')
      editor.setValue(intro);
    }
  })

  // When code changes, put it into the editor
  scratchpadEditorRef.on('value', function(dataSnapshot) {

    var thisClientStatus;
    thisClientRef.once('value', function(dataSnapshot){
      thisClientStatus = dataSnapshot.val();
    });

    // If this is a new scratchpad, put in our intro
    var clearReadOnlyMode;
    if (dataSnapshot.child('code').val() == null) {
      editor.setValue(intro);
    } else if (thisClientStatus == 'typing') {
      // do nothing, we're the ones typing in the first place
    } else {
      window.clearTimeout(clearReadOnlyMode);
      editor.setReadOnly(true);
      editor.setValue(dataSnapshot.child('code').val());
      clearReadOnlyMode = setTimeout(function(){
        editor.setReadOnly(false);
      }, 2000);
    }

    // Clear selection and move cursor to where it needs to be
    editor.clearSelection();
    if (dataSnapshot.child('cursor').val() === null) {
      editor.moveCursorToPosition({column: 0, row: 0});
    } else {
      editor.moveCursorToPosition(dataSnapshot.child('cursor').val());
    }

  });



  // On keyup, save the code and cursor data to firebase
  var typingTimeout;
  var debounceInterval = 1000;
  $('#editor').on('keyup', _.debounce(function(){
    console.log('debouncing')

    // Tell firebase who is editing
    window.clearTimeout(typingTimeout);
    thisClientRef.set('typing')

    // Get cursor position
    var startrow = editor.selection.getRange().start.row;
    var startcolumn = editor.selection.getRange().start.column;
    var endrow = editor.selection.getRange().end.row;
    var endcolumn = editor.selection.getRange().end.column;

    // If nothing is highlighted, ship contents of editor and cursor data to Firebase
    if (startrow == endrow && startcolumn == endcolumn) {
      scratchpadEditorRef.set({code: editor.getValue(), cursor: editor.selection.getCursor()});
    }

    // Set a timeout for 2 seconds that tells firebase who is typing
    typingTimeout = setTimeout(function(){
      thisClientRef.set('idle')
    }, 2000) ;

  }, debounceInterval));

  // On data change, re-render the code in the iframe.
  editor.getSession().on('change', _.debounce(function(e) {
    iframedoc.body.innerHTML = editor.getValue();
    //console.log(editor.getValue())
    setTimeout(function () { //should actually wait for body to load, setTimeout is just a hack

        process_stylus_tags(iframedoc.body)
        exec_body_scripts(iframedoc.body)
    },50)



    // Resize the menu icon if appropriate
    var linesOfCode = editor.session.getLength();
    if (linesOfCode < 10) {
      $('#menu').attr('class', 'small')
    } else if ( linesOfCode > 9 && linesOfCode < 99) {
      $('#menu').attr('class', 'medium')
    } else if ( linesOfCode > 99 && linesOfCode < 999) {
      $('#menu').attr('class', 'large')
    } else if (linesOfCode > 999){
      $('#menu').attr('class', 'x-large')
    }
  },debounceInterval));


window.update_gist = function() {

    var deferred = Q.defer()

    var content = editor.getValue()

    var id = localStorage.getItem('last_created_gist_id')

    var payload = {
      "description": "a gist created from scratchpad",
      "public": false,
      "files": {
        "gist.html": {
          "content": content
        }
      }
    }


    var username = localStorage.getItem('github_personal_access_token')
    var password = "x-oauth-basic"



    var oReq = new XMLHttpRequest();
    oReq.onreadystatechange = function() {

        if (oReq.readyState == 4) {
            if (oReq.status !== 201) { //successful gist creation results in 201
                deferred.reject(oReq.responseText)
                console.warn('error talking to github', oReq.responseText)

            }
            else {
                console.log('success!', oReq.responseText)
                var id = JSON.parse(oReq.responseText).id

                deferred.resolve()
            }

        }
    }

    //http://developer.github.com/v3/repos/contents
    var url = "https://api.github.com/gists/" + id


    oReq.open("PATCH", url, true);
    oReq.setRequestHeader('Content-Type', 'application/json')
    /*
    READMEs, files, and symlinks support the following custom media type.

    application/vnd.github.VERSION.raw

    */
    oReq.setRequestHeader('Authorization', make_base_auth(username, password));
    oReq.send(JSON.stringify(payload));

    return deferred.promise;

}


window.create_gist = function() {

    var deferred = Q.defer()

    var content = editor.getValue()


    var payload = {
      "description": "a gist created from scratchpad",
      "public": false,
      "files": {
        "gist.html": {
          "content": content
        }
      }
    }


    var username = localStorage.getItem('github_personal_access_token')
    var password = "x-oauth-basic"



    var oReq = new XMLHttpRequest();
    oReq.onreadystatechange = function() {

        if (oReq.readyState == 4) {
            if (oReq.status !== 201) { //successful gist creation results in 201
                deferred.reject(oReq.responseText)
                console.warn('error talking to github', oReq.responseText)

            }
            else {
                console.log('success!', oReq.responseText)
                var id = JSON.parse(oReq.responseText).id
                localStorage.setItem('last_created_gist_id', id)
                deferred.resolve()
            }

        }
    }

    //http://developer.github.com/v3/repos/contents
    var url = "https://api.github.com/gists"


    oReq.open("POST", url, true);
    oReq.setRequestHeader('Content-Type', 'application/json')
    /*
    READMEs, files, and symlinks support the following custom media type.

    application/vnd.github.VERSION.raw

    */
    oReq.setRequestHeader('Authorization', make_base_auth(username, password));
    oReq.send(JSON.stringify(payload));

    return deferred.promise;

}

//cool idea to make a folder in the repo called scratchpad which holds files named
//whatever the current scratchpad is named. gets updated every time we hit the github

//create file seems to be the same call as update file except that create file doesnt take a sha
//parameter
window.create_file_in_github = function(options) {

    var deferred = Q.defer()

    var path = options.path
    var message = options.message
    var content = options.content
    var branch = options.branch
    var owner = options.owner
    var repo = options.repo

    validateRef(branch)

    var payload = {
        path: path,
        message : message,
        content : btoa(content),
        branch : branch
    }


    var username = localStorage.getItem('github_personal_access_token')
    var password = "x-oauth-basic"


    var oReq = new XMLHttpRequest();
    oReq.onreadystatechange = function() {

        if (oReq.readyState == 4) {
            if (oReq.status !== 200) {
                deferred.reject(oReq.responseText)
                console.warn('error talking to github', oReq.responseText)

            }
            else {
                console.log('success!', oReq.responseText)

                deferred.resolve()
            }

        }
    }

    //http://developer.github.com/v3/repos/contents
    var url = "https://api.github.com/repos/" + owner + '/' + repo + '/contents/' + path

    console.log('sending PUT request to', url)
    oReq.open("PUT", url, true);
    oReq.setRequestHeader('Content-Type', 'application/json')
    /*
    READMEs, files, and symlinks support the following custom media type.

    application/vnd.github.VERSION.raw

    */
    oReq.setRequestHeader('Authorization', make_base_auth(username, password));
    oReq.send(JSON.stringify(payload));

    return deferred.promise;

}

window.commit_file_to_github = function(options) {

    var deferred = Q.defer()

    var path = options.path
    var message = options.message
    var content = options.content
    var sha = options.sha
    var branch = options.branch
    var owner = options.owner
    var repo = options.repo

    validateRef(branch)

    var payload = {
        path: path,
        message : message,
        content : content,
        sha : sha,
        branch : branch
    }


    var username = localStorage.getItem('github_personal_access_token')
    var password = "x-oauth-basic"



    var oReq = new XMLHttpRequest();
    oReq.onreadystatechange = function() {

        if (oReq.readyState == 4) {
            if (oReq.status !== 200) {
                deferred.reject(oReq.responseText)
                console.warn('error talking to github', oReq.responseText)

            }
            else {
                console.log('success!', oReq.responseText)

                var blobSha = JSON.parse(oReq.responseText).content.sha
                deferred.resolve(blobSha)
            }

        }
    }

    //http://developer.github.com/v3/repos/contents
    var url = "https://api.github.com/repos/" + owner + '/' + repo + '/contents/' + path

    console.log('sending PUT request to', url)
    oReq.open("PUT", url, true);
    oReq.setRequestHeader('Content-Type', 'application/json')
    /*
    READMEs, files, and symlinks support the following custom media type.

    application/vnd.github.VERSION.raw

    */
    oReq.setRequestHeader('Authorization', make_base_auth(username, password));
    oReq.send(JSON.stringify(payload));

    return deferred.promise;

}

window.process_github_tags = function () {


  iframe_used_to_extract_editor_tags = document.createElement('iframe')
  iframe_used_to_extract_editor_tags.sandbox = 'allow-same-origin'

  iframe_used_to_extract_editor_tags.classList.add('iframe_used_to_extract_editor_tags')

  var promises = []

  document.body.appendChild(iframe_used_to_extract_editor_tags)

  iframe_used_to_extract_editor_tags_document = iframe_used_to_extract_editor_tags.contentDocument || iframe_used_to_extract_editor_tags.contentWindow.document
  iframe_used_to_extract_editor_tags_document.body.innerHTML = editor.getValue()

  var github_tags = iframe_used_to_extract_editor_tags_document.querySelectorAll('script[github]')

  for (i = 0; i<github_tags.length; i++) {
    (function () {


        var github_tag = github_tags[i]
        var deferred = Q.defer()

        promises.push(deferred.promise)


        if (github_tag.getAttribute('data-blob-sha')) { //then assume we've already grabbed the file from github -- so dont go grab it again -- instead .. commit changes (AND MAYBE UPDATE THE blob sha?)
           console.log('comitting')
           commit_file_to_github({
                content : btoa(github_tag.innerHTML),
                message : localStorage.getItem('github_next_commit_message') || defaultCommitMessage,
                sha : github_tag.getAttribute('data-blob-sha'),
                owner : github_tag.getAttribute('owner'),
                repo : github_tag.getAttribute('repo'),
                branch : github_tag.getAttribute('ref'),
                path :github_tag.getAttribute('path')
            })
           .then(function (blobSha) {
                github_tag.setAttribute('data-blob-sha',blobSha)

                editor.setValue(iframe_used_to_extract_editor_tags_document.body.innerHTML)
                editor.clearSelection()

                localStorage.setItem('github_next_commit_message') = ""
                document.querySelector('input#github-next-commit-message').value = ""


                deferred.resolve()
           })
           .fail(function () {
                deferred.reject()
            })
           .done()
        }
        else {


            var blobSha;
            getBlobShaFromGithub({
              owner : github_tag.getAttribute('owner'),
              repo : github_tag.getAttribute('repo'),
              ref : github_tag.getAttribute('ref'),
              path :github_tag.getAttribute('path')
            }).then(function (_blobSha) {
              blobSha = _blobSha;
              console.log('recieved blobSha', blobSha)
              return getFileFromGithub({
                  owner : github_tag.getAttribute('owner'),
                  repo : github_tag.getAttribute('repo'),
                  ref : github_tag.getAttribute('ref'),
                  path :github_tag.getAttribute('path')
              })
            }).then(function (filecontents) {
                console.log('just grabbed this gem from github', filecontents)
                github_tag.innerHTML= filecontents
                github_tag.setAttribute('data-blob-sha', blobSha)

                editor.setValue(iframe_used_to_extract_editor_tags_document.body.innerHTML)
                editor.clearSelection()
                deferred.resolve()
            })
            .fail(function () {
                deferred.reject()
            })
            .done()

        //eventually remove this iframe from dom...
        }

    })()
   }

  return Q.all(promises);

}


var loadStylus = function(body_el) {
    var deferred = Q.defer()

    var stylusSrc = '/lib/stylus/stylus.min.js'

     if (iframedoc.querySelector('script[src="' + stylusSrc + '"]')) { //dont load the script twice!
        deferred.resolve()
        return deferred.promise;
     }

    stylus_script = iframedoc.createElement("script")
    stylus_script.type = "text/javascript";
    stylus_script.src = stylusSrc

    stylus_script.addEventListener('load',function () {
        stylus_script.async = false
        deferred.resolve()
    }, false)


    head = iframedoc.getElementsByTagName("head")[0] || iframedoc.documentElement ;

    head.insertBefore(stylus_script, head.firstChild);


    return deferred.promise;

}

var process_stylus_tags = function(body_el) {
    console.log('processing stylus tags')
    loadStylus()
        .then(function () {
            stylus_tags = iframedoc.querySelectorAll('style[type="stylesheet/stylus"]');
            console.log('stylus tags', stylus_tags)
            var i;

            var stylusTagid = 'stylus-tag-0e23a83';
            var stylusTag;

            if (iframedoc.querySelector('#' + stylusTagid)) {
                stylusTag = iframedoc.querySelector('#' + stylusTagid)

                stylusTag.innerHTML = ""
            }
            else {
                stylusTag = iframedoc.createElement("style")
                head = iframedoc.getElementsByTagName("head")[0] || iframedoc.documentElement ;
                stylusTag.id = stylusTagid
                head.insertBefore(stylusTag, head.firstChild);

            }

            for (i=0;i<stylus_tags.length;i++) {
                console.log('processing tag', i, stylus_tags[i].innerHTML)
                console.log(iframe.contentWindow.stylus)

                iframe.contentWindow.stylus(stylus_tags[i].innerHTML).render(function(err, css) {

                    if (err) console.warn(err)
                    console.log('css',css)



                    stylusTag.innerHTML +=css;

                    console.log('adding', css)


                })
            }

        })


}


function validateRef(ref) {
    //ref = the name of the commit/branch/tag

    if (!ref ) {
        throw 'ref must be defined -- an undefined, null or empty string ref will default to master and at this point, we arent allowing interaction with the master branch'
    }
    else if (ref && ref === 'master') {
        throw 'ref cannot be master'
    }
}



function make_base_auth(user, password) {
  var tok = user + ':' + password;
  var hash = btoa(tok);
  return "Basic " + hash;
}

window.getFileFromGithub = function(options) {

    var deferred = Q.defer();

    var owner = options.owner;
    var repo = options.repo;
    var ref = options.ref;
    var path = options.path;

    validateRef(ref)

    var username = localStorage.getItem('github_personal_access_token')
    var password = "x-oauth-basic"



    var oReq = new XMLHttpRequest();
    oReq.onreadystatechange = function() {

        if (oReq.readyState == 4) {
            if (oReq.status !== 200) {
                deferred.reject(oReq.responseText)
                console.warn('error talking to github', oReq.responseText)

            }
            else {
                console.log('success!', oReq.responseText)
                var filecontents = oReq.responseText
                deferred.resolve(filecontents)
            }

        }
    }

    //http://developer.github.com/v3/repos/contents
    var url = "https://api.github.com/repos/" + owner + '/' + repo + '/contents/' + path + '?ref=' + encodeURI(ref)

    console.log('sending request to', url)
    oReq.open("GET", url, true);
    oReq.setRequestHeader('Accept', 'application/vnd.github.V3.raw')
    /*
    READMEs, files, and symlinks support the following custom media type.

    application/vnd.github.VERSION.raw


    */
    oReq.setRequestHeader('Authorization', make_base_auth(username, password));
    oReq.send();

    return deferred.promise;


}

window.getBlobShaFromGithub = function(options) { //probably could do this somehow in getFileFromGithub if we knew how to decode the base64 string that gets returned

    console.log('getting blob sha')

    var deferred = Q.defer();

    var owner = options.owner;
    var repo = options.repo;
    var ref = options.ref;
    var path = options.path;

    validateRef(ref)

    var username = localStorage.getItem('github_personal_access_token')
    var password = "x-oauth-basic"


    var oReq = new XMLHttpRequest();
    oReq.onreadystatechange = function() {

        if (oReq.readyState == 4) {
            if (oReq.status !== 200) {
                deferred.reject(oReq.responseText)
                console.warn('error talking to github', oReq.responseText)

            }
            else {
                console.log('success!', oReq.responseText)
                var responseObj = JSON.parse(oReq.responseText)

                deferred.resolve(responseObj.sha)
            }

        }
    }

    //http://developer.github.com/v3/repos/contents
    var url = "https://api.github.com/repos/" + owner + '/' + repo + '/contents/' + path  + '?ref=' + encodeURI(ref)

    console.log('sending request to', url)
    oReq.open("GET", url, true);

    oReq.setRequestHeader('Authorization', make_base_auth(username, password));
    oReq.setRequestHeader('Content-Type', 'application/json')

    oReq.send(JSON.stringify({
        ref : ref
    }));

    return deferred.promise;


}

//http://stackoverflow.com/a/3250386
  var exec_body_scripts = function(body_el) {
  // Finds and executes scripts in a newly added element's body.
  // Needed since innerHTML does not run scripts.
  //
  // Argument body_el is an element in the dom.

  function nodeName(elem, name) {
    return elem.nodeName && elem.nodeName.toUpperCase() ===
              name.toUpperCase();
  };

  function evalScript(elem,scriptsWithSrcs,scriptsWithoutSrcs) {

    var deferred = Q.defer()

    var data = (elem.text || elem.textContent || elem.innerHTML || "" ),
        head = iframedoc.getElementsByTagName("head")[0] ||
                  iframedoc.documentElement,
        script = iframedoc.createElement("script");


    script.type = "text/javascript";
    try {
      // doesn't work on ie...
      script.appendChild(iframedoc.createTextNode(data));
    } catch(e) {
      // IE has funky script nodes
      script.text = data;
    }



    if (elem.src) {
        if (elem.src in scriptsWithSrcs) {
            deferred.resolve()
            return deferred.promise
        }
        script.src = elem.src
    script.addEventListener('load',function () {
        script.async = false;

        deferred.resolve()
    }, false)
    }
    else {
        if (data in scriptsWithoutSrcs) {
            if (elem.attributes.getNamedItem('data-scratchpad-rerender')) {
                scriptsWithoutSrcs[data].parentElement.removeChild(scriptsWithoutSrcs[data])
            }
            else {
                deferred.resolve()
                return deferred.promise
            }

        }
        deferred.resolve()
    }



    head.insertBefore(script, head.firstChild);


    //head.removeChild(script);


    console.log('inserting')

    return deferred.promise

  };



  // main section of function
  var scripts = [],
      script,
      children_nodes = body_el.childNodes, //BS: probably will fail if tags are nested
      child,
      i;

   var head = iframedoc.getElementsByTagName("head")[0] || iframedoc.documentElement;

  var scriptsWithSrcs = {}
  var scriptsWithoutSrcs = {}


 for (i = 0; head.childNodes[i]; i++) {
    child = head.childNodes[i];
    if (nodeName(child, "script" ) &&
      (!child.type || child.type.toLowerCase() === "text/javascript")) {
          if (child.src) {
            scriptsWithSrcs[child.src] = child
          }
          else {
            scriptsWithoutSrcs[child.text || child.textContent || child.innerHTML || ""] = child
          }
      }
  }




  for (i = 0; children_nodes[i]; i++) {
    child = children_nodes[i];
    if (nodeName(child, "script" ) &&
      (!child.type || child.type.toLowerCase() === "text/javascript")) {
          scripts.push(child);
      }
  }

  scripts = scripts.map(function(script) {

    return function() {

        if (script.parentNode) {script.parentNode.removeChild(script);}
        //console.log(scripts[i])

        return evalScript(script,scriptsWithSrcs,scriptsWithoutSrcs);
    }
  })


  // scripts_promises = scripts.map(function(call_to_get_script) {
  //   return call_to_get_script(); //returns the promise
  // })

    scripts.reduce(Q.when, Q())
 // Q.all(scripts_promises) //TODO - should probably hold the page loading off until this point...

};


  // Filename Stuff
  //--------------------------------------------------------------------------------
  var scratchpadTitleRef = scratchpadRef.child('title');

  // Show title on top, keep updated from server
  scratchpadTitleRef.on('value', function(titleSnapshot) {
    if (titleSnapshot.val() == null) {
      scratchpadTitleRef.set('Untitled document');
      document.title = 'Untitled document';
    } else {
      $('#title').text(titleSnapshot.val());
      document.title = titleSnapshot.val();
    }
  });

  // Let users update title when they click it
  $('#title').click(function(){
    var newTitle = prompt('What do you want to name your file?', $(this).text());
    if (newTitle != null) {
      scratchpadTitleRef.set(newTitle);
    }
  });

  // Stupid (webkit only?) hover bug fix
  $('#title').hover(function(){$(this).addClass('hover')}, function(){$(this).removeClass('hover')});


  // Fullscreen mode stuff
  //--------------------------------------------------------------------------------

  // Toggle fullscreen mode.
  function toggleFullscreen() {
    if ($('#scratchpad').hasClass('menu')) {
      $('#scratchpad').removeClass('menu');
    }
    $('#scratchpad').toggleClass('fullscreen');
    location.hash = $('#scratchpad').attr('class');
  }

  // When the button is clicked, call toggleFullscreen.
  $('#toggle-fullscreen').click(function() {
    toggleFullscreen();
  });

  // Even when iframe has focus, still toggleFullscreen
  $("#preview").contents().find("body").on('keydown', function(e){
    if (e.keyCode == 73) {
      toggleFullscreen();
    }
  });

  // For good measure, always toggleFullscreen
  key('⌘+i, ctrl+i', function(){
    toggleFullscreen();
  });

  // Automatically go into fullscreen mode when pageload includes #fullscreen
  if (location.hash == '#fullscreen') {
    $('#scratchpad').toggleClass('fullscreen');
  }


  // History (Recent Scratchpads)
  //--------------------------------------------------------------------------------
  if (typeof(Storage)!=="undefined") {

    // Initialize recentScratchpads row in localStorage if needed
    if (localStorage['recentScratchpads'] === undefined) {
      localStorage['recentScratchpads'] = JSON.stringify([]);
    }

    function getRecentScratchpads() {
      var scratchpadIds = JSON.parse(localStorage['recentScratchpads']);
      return scratchpadIds;
    }

    function addToRecentScratchpads(id) {
      var recentScratchpadsArr = [];
      recentScratchpadsArr = JSON.parse(localStorage['recentScratchpads']) || [];
      if (!_.contains(recentScratchpadsArr, id)) {
        recentScratchpadsArr.push(id);
        localStorage['recentScratchpads'] = JSON.stringify(recentScratchpadsArr);
      } else {
        recentScratchpadsArr = _.without(recentScratchpadsArr, id);
        recentScratchpadsArr.push(id);
        localStorage['recentScratchpads'] = JSON.stringify(recentScratchpadsArr);
      }
    }

    function renderRecentScratchpads(listOfRecentScratchpads) {

      if (listOfRecentScratchpads.length > 1) {

        // Clear the loading text, save state that it's been loaded
        $('#recent-scratchpads').html('');
        var recentScratchpadTemplate = '<li><a class="recent-scratchpad" href="/#<%= scratchpadId %>" target="_blank"><%= thisScratchpadTitle %> <time><%= dateTemplate %></time></a><a class="delete" data-id="<%= scratchpadId %>" href="javascript:void(0)">&times;</a></li>';

        _.each(listOfRecentScratchpads, function(scratchpadId) {
          if (Scratchpad.document_id != scratchpadId) {

            var thisScratchpadRef = new Firebase(firebase_url + scratchpadId);
            thisScratchpadRef.once('value', function(dataSnapshot) {
              var thisScratchpadTitle = dataSnapshot.child('title').val();
              dateObj = new Date(dataSnapshot.child('updatedAt').val());
              dateTemplate = dateObj.getDate() +'/'+ dateObj.getMonth() +'/'+ dateObj.getFullYear();
              thisScratchpadTemplate = _.template(recentScratchpadTemplate, {scratchpadId: scratchpadId, thisScratchpadTitle: thisScratchpadTitle, dateTemplate: dateTemplate});
              $('#recent-scratchpads').prepend(thisScratchpadTemplate);
            });

          }
        });

      } else {
        $('#recent-scratchpads').html('<li>No recent scratchpads!</li>');
      }
      Scratchpad.loadedRecentScratchpads = true;
    }

    function deleteRecentScratchpadFromList (id) {

      // Delete from localstore
      var recentScratchpadsArr;
      recentScratchpadsArr = JSON.parse(localStorage['recentScratchpads']);
      recentScratchpadsArr = _.without(recentScratchpadsArr, id);
      localStorage['recentScratchpads'] = JSON.stringify(recentScratchpadsArr);

      // Delete from DOM
      $('#recent-scratchpads li').each(function(index){
        if ($(this).children('.delete').data('id') == id) {
          $(this).remove();
        }
      });
    }

    $('#recent-scratchpads').on('click', '.delete', function(e) {
      deleteRecentScratchpadFromList($(this).data('id'));
    });

    addToRecentScratchpads(Scratchpad.document_id);

  } else {
    // Sorry! No web storage support.
    $('#recent-scratchpads').html('Sorry! Your browser doesn\'t support HTML5 local storage.');
  }


  // Menu stuff
  //--------------------------------------------------------------------------------

  // Toggle fullscreen mode on menu click
  $('#menu').click(function(){
    $('#scratchpad').toggleClass('menu');

    if (Scratchpad.loadedRecentScratchpads != true) {
      renderRecentScratchpads(getRecentScratchpads());
    }
  })

  // Show different tooltip for Windows users.
  var isMac = navigator.platform.toUpperCase().indexOf('MAC')!==-1;
  if (isMac != true) {
    $('.tooltip').html('Keyboard Shortcut: Control + i');
  }



  // Drag to resize
  //--------------------------------------------------------------------------------

  var clicking = false;
  $('#drag-handle').mousedown( function() {
    clicking = true;
    $(this).addClass('dragging');
  });

  $(window).mouseup( function() {
    $('#drag-handle').removeClass('dragging');
    $('body').removeClass('resizing');
    clicking = false;
  });

  $(window).mousemove( function(e) {

    if (clicking === true) {
      editor.resize();
      $('body').addClass('resizing');
      $('#preview').css('right', '0px');
      $('#preview').css('width', window.innerWidth - e.pageX);
      $('#preview').css('left', e.pageX + 'px');
      $('#drag-handle').css('left', (e.pageX - 5) + 'px');
      $('#commandbar, #editor, #footer').css('right', window.innerWidth - e.pageX);
    }

  });

});
