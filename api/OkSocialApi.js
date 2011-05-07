var OkSocialApi = function(params, callback) {
	var instance = this;

	// params
	params = jQuery.extend({
		ok_sanbox: false,
		width: 760,
		/*fields: 'uid,first_name,last_name,name,gender,birthday,age,locale,' +
				'current_status,current_status_id,current_status_date,' +
				'pic_1,pic_2,pic_3,pic_4,' +
				'url_profile,url_profile_mobile,url_chat,url_chat_mobile,' +
				'has_email'*/
		fields: 'uid,first_name,last_name,name,gender,birthday,age,pic_1,pic_2,pic_3,pic_4'
	}, params);

	var apiUrl = 'http://api.odnoklassniki.ru/js/fapi.js';
	if (params.ok_sanbox) {
		apiUrl = 'http://api-sandbox.odnoklassniki.ru:8088/js/fapi.js';
	}
	// private
	var wrap_callback = function(callback) {
		if (typeof callback == 'function') {
			window.API_callback = function(method, result, data) {

				data = jQuery.parseJSON(data);
				data.result = result;

				delete window.API_callback;

				callback(data);
			};
		}		
	};

	var callRaw = function(method, params, callback) {
		params = jQuery.extend({
			method: method
		}, params);

		FAPI.Client.call(params, callback);
	};

	var moduleExport = {
		// raw api object - returned from remote social network
		raw: null,

		// information methods
		getFriends : function(callback) {
			callRaw('friends.get', {}, function(status, data, error) {
				if (status == 'ok') {
					callRaw('users.getInfo', {fields: params.fields, uids: data.join(',')}, function(status, data, error) {
						if (status == 'ok') {
							callback ? callback(data) : null;
						}
						else callback ? callback(error) : null;
					});
				}
				else callback ? callback(error) : null;
			});
		},
		getCurrentUser : function(callback) {
			callRaw('users.getInfo', {fields: params.fields, uids: FAPI.Client.uid}, function(status, data, error) {
				if (status == 'ok') {
					callback ? callback(data[0]) : null;
				}
				else callback ? callback(error) : null;
			});
		},
		getAppFriends : function(callback) {
			callRaw('friends.getAppUsers', {}, function(status, data, error) {
				if (status == 'ok') {
					callRaw('users.getInfo', {fields: params.fields, uids: data.uids.join(',')}, function(status, data, error) {
						if (status == 'ok') {
							callback ? callback(data) : null;
						}
						else callback ? callback(error) : null;
					});
				}
				else callback ? callback(error) : null;
			});
		},
		// utilities
		inviteFriends : function() {
			var params = arguments[0] || null;
			var callback = arguments[1] || null;
			if (typeof params == 'function') {
				callback = params;
			}
			FAPI.UI.showInvite(params.install_message);
			
			callback ? callback() : null;
		},
		resizeWindow : function(params, callback) {
			FAPI.UI.setWindowSize(params.width, params.height);

			callback ? callback() : null;
		},
		// service methods
		postWall : function(params, callback) {
			params = jQuery.extend({id: FAPI.Client.uid}, params);

			window.API_callback = function(method, status, attributes) {
				if (method == 'showConfirmation' && status == 'ok') {
					publishMessage.resig = attributes;
					callRaw('stream.publish', publishMessage, callback);
				}
				delete window.API_callback;
			};
			var publishMessage = {
				message: params.message,
				method: "stream.publish",
				application_key: FAPI.Client.applicationKey,
				session_key: FAPI.Client.sessionKey,
				format: FAPI.Client.format
			};
			publishMessage.sig = FAPI.Util.calcSignature(publishMessage, FAPI.Client.sessionSecretKey);

			FAPI.UI.showConfirmation("stream.publish", params.message, publishMessage.sig);
		},
		makePayment : function(params, callback) {
			wrap_callback(callback);
			
			FAPI.UI.showPayment(params.name, params.description, null, null, JSON.stringify(params.items), [], 'ok', true);
		}
	};

	// constructor
	jQuery.getScript(apiUrl, function() {
		var FAPI_Params = Object(FAPI.Util.getRequestParameters());

		FAPI.init(FAPI_Params.api_server, FAPI_Params.apiconnection, function() {
			moduleExport.raw = FAPI;

			// export methods
			instance.moduleExport = moduleExport;

			callback ? callback() : null;
		});
	});
};
/*
var publishMessage = null;
function API_callback(method, status, attributes){// Odnokl madness
    if(method == 'showConfirmation') {
		if(status == 'ok'){
			publishMessage.resig = attributes;
			publishMessage.method = "stream.publish";
			core_log("api_postNews - streamPublish ok, posting",publishMessage);
			FAPI.Client.call( publishMessage, function(status, data, error) { });
		}else{
			core_log("api_postNews - streamPublish failed!",publishMessage);
		}
    }
}

api_postNews = function(parameters) {
	core_log("api_postNews",parameters);
	var uid_to = parameters.target_refnick;
	var image_url = parameters.image_url;
	var news_title = parameters.news_title;
	var news_text = parameters.news_text;
	var action_title = parameters.action_title;
	var action_hash = parameters.action_hash;
	{// wall publish
		var request = {};
		request.message = news_text;//=FAPI.Util.encodeUtf8("Ураааа!")-NotOK;//="Поздравляем"-OK;
		if(image_url != null && image_url != ""){
			var attachment = { };
			request.message = news_title;
			attachment.caption = news_text;
			attachment.media = [];
			attachment.media.push( { type:"image", src:image_url } );
			request.attachment = $.toJSON( attachment );
		}
		if(action_title != null && action_title != ""){
			// href is hash, not an URL!!!
			// OD documentation totally fucked up
			//if(action_hash.indexOf("http://")<0){
			//	action_hash = wla.struct_app_config.game_url+"#"+action_hash;
			//}
			if(action_hash.length<2){
				action_hash = "none";
			}
			var action_links = [];
			action_links.push( { text: action_title, href: action_hash } );
			request.action_links = $.toJSON( action_links );
		}
		publishMessage = request;
		publishMessage["method"] = "stream.publish";
		publishMessage["application_key"] = FAPI.Client.applicationKey;
		publishMessage["session_key"] = FAPI.Client.sessionKey;
		publishMessage["format"] = FAPI.Client.format;
		publishMessage['sig'] = FAPI.Util.calcSignature(publishMessage, FAPI.Client.sessionSecretKey);
		core_log("api_postNews - showConfirmation",request);
		FAPI.UI.showConfirmation("stream.publish", news_title+"\n"+news_text, publishMessage['sig']);
	}
}
*/