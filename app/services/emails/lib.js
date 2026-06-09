const ejs      = require('ejs')
const flow     = require('async')
const fs       = require('fs')      
const moment   = require('moment')
const path     = require('path')
const postmark = require('postmark')
const util     = require(__bsedir + '/util')

module.exports = {

    send : async function(email, fn = function() {}) {

        let email_sent          = null
        let email_sent_postmark = null


        let email_client  = new postmark.ServerClient(email.email_env.server_token)

        let email_config  = {
            From          : email.email_tld + ' <' + email.email_address_sender + '>',
            To            : email.email_address_recipient,
            MessageStream : email.email_env.stream_id
        }

        let email_content = {
            Subject       : null,
            HtmlBody      : null,
            TextBody      : null
        }

        // ---

        let path_html_body    = null
        let path_text_body    = null
        let path_text_subject = null

        let html_body         = null      
        let text_body         = null      
        let text_subject      = null      

        switch(email.email_type) {

            case 'auth_activations_request' :

                // normalize paths
                path_html_body    = path.join(__pubdir, 'html/email_auth_activations_request_html.ejs')
                path_text_body    = path.join(__pubdir, 'html/email_auth_activations_request.ejs')
                path_text_subject = path.join(__pubdir, 'html/email_auth_activations_request_subject.ejs')

                // load template files
                html_body         = fs.readFileSync(path_html_body, 'utf8')
                text_body         = fs.readFileSync(path_text_body, 'utf8')
                text_subject      = fs.readFileSync(path_text_subject, 'utf8')

                // render templates
                email_content.Subject   = ejs.render(text_subject, { email }, { filename: path_text_subject })
                email_content.HtmlBody  = ejs.render(html_body,    { email }, { filename: path_html_body })
                email_content.TextBody  = ejs.render(text_body,    { email }, { filename: path_text_body })

                break

            case 'auth_passwords_request' :

                // normalize paths
                path_html_body    = path.join(__pubdir, 'html/email_auth_passwords_request_html.ejs')
                path_text_body    = path.join(__pubdir, 'html/email_auth_passwords_request.ejs')
                path_text_subject = path.join(__pubdir, 'html/email_auth_passwords_request_subject.ejs')

                // load template files
                html_body         = fs.readFileSync(path_html_body, 'utf8')
                text_body         = fs.readFileSync(path_text_body, 'utf8')
                text_subject      = fs.readFileSync(path_text_subject, 'utf8')

                // render templates
                email_content.Subject   = ejs.render(text_subject, { email }, { filename: path_text_subject })
                email_content.HtmlBody  = ejs.render(html_body,    { email }, { filename: path_html_body })
                email_content.TextBody  = ejs.render(text_body,    { email }, { filename: path_text_body })

                break

            case 'auth_codes_create' :

                // normalize paths
                path_html_body    = path.join(__pubdir, 'html/email_auth_codes_create_html.ejs')
                path_text_body    = path.join(__pubdir, 'html/email_auth_codes_create.ejs')
                path_text_subject = path.join(__pubdir, 'html/email_auth_codes_create_subject.ejs')

                // load template files
                html_body         = fs.readFileSync(path_html_body, 'utf8')
                text_body         = fs.readFileSync(path_text_body, 'utf8')
                text_subject      = fs.readFileSync(path_text_subject, 'utf8')

                // render templates
                email_content.Subject   = ejs.render(text_subject, { email }, { filename: path_text_subject })
                email_content.HtmlBody  = ejs.render(html_body,    { email }, { filename: path_html_body })
                email_content.TextBody  = ejs.render(text_body,    { email }, { filename: path_text_body })

                break

            default :
                return fn({
                    data    : {
                        email : {
                            email_type : email.email_type
                        }
                    },
                    message : 'Email type (' + email.email_type + ') not supported.',
                    status  : 400
                })
                break

        }

        email_config = {
            ...email_config,
            ...email_content
        }

        try {

            // send email
            email_sent_postmark = await email_client.sendEmail(email_config)
    
            /*
            {
            ErrorCode   : 0,
            Message     : 'OK',
            MessageID   : '6c2b7d3b-2409-4c58-ae5f-ef1ab0e8721d',
            SubmittedAt : '2025-11-10T09:19:57.0593642Z',
            To          : 'john@gmail.com'
            }
            */

            switch(email_sent_postmark.ErrorCode) {

                // ok
                case 0 : 

                    email_sent = {
                        email_id_postmark : email_sent_postmark.MessageID,
                        state             : email_sent_postmark.Message.toLowerCase(),
                        ts                : email_sent_postmark.SubmittedAt,
                    }

                    break

                default : 

                    return fn(err)

                    break

            }
        
        } catch(err) {
            return fn(err)
        
        }
        
        fn(null, {
            email : {
                email_config : email_config,
                email_sent   : email_sent
                
            }
        })

    }

}
