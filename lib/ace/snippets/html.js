define('ace/snippets/html', ['require', 'exports', 'module' ], function(require, exports, module) {


exports.snippetText = "# Some useful snippets\n\
snippet github_wayla_script\n\
	<script github owner=\"Wayla\" repo=\"fire-wayla\" ref=\"${1}\" path=\"${2}\" ></script>\n\
snippet github_wayla_template\n\
	<script github owner=\"Wayla\" repo=\"fire-wayla\" ref=\"${1}\" path=\"${2}\" type='text/template'></script>\n\
snippet stylus\n\
	<style type='stylesheet/stylus'></style>\n\
";
exports.scope = "html";

});
