import { useEffect } from "react";

const stylesheet = `
.internal-chat{display:grid;min-height:calc(100vh - 134px);height:calc(100vh - 134px);grid-template-columns:minmax(245px,300px) minmax(0,1fr);overflow:hidden;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:0 3px 12px rgba(27,49,40,.035)}
.internal-chat-sidebar{display:flex;min-height:0;flex-direction:column;border-right:1px solid var(--line);background:var(--surface)}
.internal-chat-brand{height:68px;flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:0 16px;border-bottom:1px solid var(--line)}
.internal-chat-mark{width:36px;height:36px;display:grid;place-items:center;border-radius:9px;background:var(--green-900);color:#fff}
.internal-chat-brand strong,.internal-chat-brand small,.internal-chat-profile strong,.internal-chat-profile small{display:block}
.internal-chat-brand strong{font-size:13px}.internal-chat-brand small{margin-top:3px;color:var(--muted);font-size:9px}
.internal-chat-icon-button{width:32px;height:32px;margin-left:auto;border-radius:7px;background:transparent;color:var(--muted);font-size:20px}
.internal-chat-icon-button:hover{background:var(--canvas)}
.internal-chat-profile{display:flex;align-items:center;gap:10px;margin:14px 13px 0;padding:10px;border-radius:8px;background:var(--canvas)}
.internal-chat-avatar{width:34px;height:34px;display:grid;place-items:center;flex:0 0 auto;border-radius:50%;background:var(--green-100);color:var(--green-900);font-size:12px;font-weight:700}
.internal-chat-profile strong{overflow:hidden;font-size:10px;text-overflow:ellipsis;white-space:nowrap}
.internal-chat-profile small{margin-top:3px;color:var(--muted);font-size:9px}
.internal-chat-list-heading{display:flex;align-items:center;justify-content:space-between;margin:23px 16px 11px}
.internal-chat-list-heading small{color:var(--green-700);font-size:8px;font-weight:700;letter-spacing:.65px}
.internal-chat-list-heading h2{margin:4px 0 0;font-size:16px}
.internal-chat-add{width:32px;height:32px;display:grid;place-items:center;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--green-700)}
.internal-chat-add:hover{background:var(--green-50)}
.internal-chat-search{display:block;margin:0 12px 9px}
.internal-chat-search input{width:100%;height:35px;padding:0 10px;border:1px solid var(--line);border-radius:7px;outline:0;background:var(--canvas);color:var(--ink);font-size:10px}
.internal-chat-search input:focus,.internal-chat-caption:focus,.internal-chat-dialog-input:focus{border-color:var(--green-700);box-shadow:0 0 0 3px rgba(47,115,87,.09)}
.internal-chat-list{min-height:0;flex:1;overflow:auto;padding:0 7px 12px}
.internal-chat-list-message{padding:14px;color:var(--muted);font-size:10px;text-align:center}
.internal-chat-empty-list{display:grid;justify-items:center;gap:9px;padding:30px 12px;color:var(--muted);text-align:center}
.internal-chat-empty-list p{margin:0;font-size:10px}
.internal-chat-empty-list button{background:none;color:var(--green-700);font-size:10px;font-weight:700}
.internal-chat-item{width:100%;min-height:58px;display:flex;align-items:center;gap:9px;padding:8px;border-radius:8px;background:transparent;color:var(--ink);text-align:left}
.internal-chat-item:hover,.internal-chat-item.is-selected{background:var(--green-50)}
.internal-chat-item.is-selected{box-shadow:inset 3px 0 var(--green-700)}
.internal-chat-item-icon{width:34px;height:34px;display:grid;place-items:center;flex:0 0 auto;border-radius:50%;background:var(--green-100);color:var(--green-700)}
.internal-chat-item-copy{min-width:0;flex:1}.internal-chat-item-copy strong,.internal-chat-item-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.internal-chat-item-copy strong{font-size:10px}.internal-chat-item-copy small{margin-top:4px;color:var(--muted);font-size:8px}
.internal-chat-closed-tag{padding:3px 5px;border-radius:10px;background:#edf0ee;color:var(--muted);font-size:8px}
.internal-chat-status{height:42px;flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:0 16px;border-top:1px solid var(--line);color:var(--muted);font-size:9px}
.internal-chat-status>span{width:7px;height:7px;border-radius:50%}.internal-chat-status .is-online{background:#3b9566;box-shadow:0 0 0 3px rgba(59,149,102,.12)}.internal-chat-status .is-offline{background:#d29a48;box-shadow:0 0 0 3px rgba(210,154,72,.13)}
.internal-chat-conversation{display:flex;min-width:0;min-height:0;flex-direction:column}
.internal-chat-conversation-header{min-height:68px;flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 22px;border-bottom:1px solid var(--line);background:var(--surface)}
.internal-chat-conversation-title{display:flex;min-width:0;align-items:center;gap:10px}
.internal-chat-mobile-back{display:none}
.internal-chat-title-icon{width:36px;height:36px;display:grid;place-items:center;flex:0 0 auto;border-radius:50%;background:var(--green-100);color:var(--green-700)}
.internal-chat-conversation-title h1{overflow:hidden;margin:0;font-size:13px;text-overflow:ellipsis;white-space:nowrap}
.internal-chat-conversation-title p{margin:4px 0 0;color:var(--muted);font-size:9px}
.internal-chat-actions{display:flex;align-items:center;gap:6px}
.internal-chat-connection{padding:6px 8px;border-radius:15px;background:#fbf3e7;color:#9a7038;font-size:8px;white-space:nowrap}
.internal-chat-connection.online{background:var(--green-50);color:var(--green-700)}
.internal-chat-action-button{min-height:30px;padding:0 9px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:#58665e;font-size:9px}
.internal-chat-action-button:hover{background:var(--canvas)}.internal-chat-action-button.close:hover{border-color:#e9c5c2;color:#a83c35}
.internal-chat-alert,.internal-chat-notice{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 16px;background:#fff0ed;color:#9a3c30;font-size:10px}
.internal-chat-notice{background:#eef6f1;color:var(--green-900)}
.internal-chat-alert button,.internal-chat-notice button{padding:0 5px;background:transparent;color:inherit;font-size:17px}
.internal-chat-messages{min-height:0;flex:1;display:flex;flex-direction:column;gap:14px;overflow:auto;padding:23px clamp(14px,3vw,38px)}
.internal-chat-empty,.internal-chat-no-selection{flex:1;display:grid;align-content:center;justify-items:center;padding:30px 15px;text-align:center}
.internal-chat-empty>span,.internal-chat-no-selection>span{width:50px;height:50px;display:grid;place-items:center;border-radius:50%;background:var(--green-50);color:var(--green-700)}
.internal-chat-empty h2,.internal-chat-no-selection h2{margin:14px 0 0;font-size:17px}
.internal-chat-empty p,.internal-chat-no-selection p{max-width:340px;margin:7px 0 0;color:var(--muted);font-size:10px;line-height:1.6}
.internal-chat-no-selection .primary-button{margin-top:17px}
.internal-chat-message{max-width:min(680px,92%);align-self:flex-start;padding:11px 13px;border:1px solid var(--line);border-radius:3px 10px 10px;background:var(--surface);box-shadow:0 2px 8px rgba(27,49,40,.025)}
.internal-chat-message.is-own{align-self:flex-end;border-color:#cfe2d4;border-radius:10px 3px 10px 10px;background:#eef7f0}
.internal-chat-message.is-other{align-self:flex-start;border-radius:3px 10px 10px}
.internal-chat-message-meta{display:flex;align-items:center;gap:8px}.internal-chat-message-meta strong{color:var(--green-700);font-size:9px}.internal-chat-message-meta time{color:var(--muted);font-size:8px}
.internal-chat-message.is-own .internal-chat-message-meta{justify-content:flex-end}
.internal-chat-message-text{margin:7px 0 0;color:#36433b;font-size:11px;line-height:1.6;overflow-wrap:anywhere;white-space:pre-wrap}
.internal-chat-attachment{max-width:390px;display:flex;align-items:center;gap:9px;margin-top:9px;padding:7px;border:1px solid var(--line);border-radius:7px;color:var(--ink);text-decoration:none}
.internal-chat-attachment:hover{border-color:#9ab9a8}
.internal-chat-attachment>img{width:48px;height:42px;border-radius:4px;object-fit:cover}
.internal-chat-file-icon{width:48px;height:42px;display:grid;place-items:center;color:var(--green-700)}
.internal-chat-attachment>span:last-child{min-width:0;display:grid;gap:3px}
.internal-chat-attachment strong{overflow:hidden;font-size:9px;text-overflow:ellipsis}
.internal-chat-attachment small{color:var(--muted);font-size:8px}
.internal-chat-composer{flex:0 0 auto;padding:12px clamp(14px,3vw,38px);border-top:1px solid var(--line);background:var(--surface)}
.internal-chat-message-form{display:flex;align-items:flex-end;gap:8px;padding:7px;border:1px solid var(--line);border-radius:8px;background:var(--canvas)}
.internal-chat-message-form:focus-within{border-color:#9ab9a8}
.internal-chat-message-form textarea{min-height:40px;max-height:110px;flex:1;resize:vertical;padding:8px;border:0;outline:0;background:transparent;color:var(--ink);font-size:10px}
.internal-chat-send{height:36px;padding:0 13px;border-radius:6px;background:var(--green-900);color:#fff;font-size:9px;font-weight:700}
.internal-chat-send:hover:not(:disabled),.internal-chat-upload:hover:not(:disabled){background:var(--green-700)}
.internal-chat-send:disabled,.internal-chat-upload:disabled{opacity:.55;cursor:not-allowed}
.internal-chat-attachment-form{min-height:30px;display:flex;align-items:center;gap:10px;padding-top:7px}
.internal-chat-file-picker{max-width:45%;overflow:hidden;color:var(--muted);font-size:9px;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}
.internal-chat-file-picker:hover{color:var(--green-700)}
.internal-chat-file-input{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%)}
.internal-chat-caption{min-width:100px;flex:1;padding:6px 8px;border:1px solid var(--line);border-radius:5px;outline:0;color:var(--ink);font-size:9px}
.internal-chat-upload{padding:5px 0;background:transparent;color:var(--green-700);font-size:9px;font-weight:700;white-space:nowrap}
.internal-chat-attachment-form>small{margin-left:auto;color:var(--muted);font-size:8px;white-space:nowrap}
.internal-chat-closed-notice{min-height:54px;flex:0 0 auto;display:grid;place-items:center;padding:10px;border-top:1px solid var(--line);color:var(--muted);font-size:10px}
.internal-chat-dialog-backdrop{position:fixed;z-index:80;display:grid;place-items:center;padding:18px;background:rgba(12,28,20,.45);inset:0}
.internal-chat-dialog{width:min(100%,460px);max-height:min(90vh,820px);display:flex;flex-direction:column;overflow:hidden;padding:23px;border:1px solid var(--line);border-radius:14px;background:var(--surface);box-shadow:0 24px 70px rgba(0,0,0,.22)}
.internal-chat-dialog.is-creating{width:min(100%,560px)}
.internal-chat-dialog-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:18px}
.internal-chat-dialog-heading small{color:var(--green-700);font-size:8px;font-weight:700;letter-spacing:.6px}
.internal-chat-dialog-heading h2{margin:5px 0 0;font-size:19px;letter-spacing:-.35px}
.internal-chat-dialog-heading button{width:30px;height:30px;border-radius:50%;background:transparent;color:var(--muted);font-size:20px}
.internal-chat-dialog-label{display:block;margin-bottom:7px;color:var(--ink);font-size:11px;font-weight:700}
.internal-chat-dialog-input{width:100%;height:42px;padding:0 12px;border:1px solid var(--line);border-radius:8px;outline:0;color:var(--ink);background:var(--surface);font-size:12px;transition:border-color .15s,box-shadow .15s}
.internal-chat-dialog-hint,.internal-chat-dialog-error{margin:10px 0 0;color:var(--muted);font-size:9px;line-height:1.5}
.internal-chat-dialog-error{color:#a83c35}
.internal-chat-dialog form{min-height:0;display:flex;flex-direction:column}
.internal-chat-dialog.is-creating form{min-height:0;flex:1}
.internal-chat-member-picker{min-height:0;display:flex;flex:1;flex-direction:column;margin-top:17px;padding:14px;border:1px solid var(--line);border-radius:11px;background:linear-gradient(180deg,#fbfcfb 0%,var(--surface) 100%)}
.internal-chat-member-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}
.internal-chat-member-heading>div{display:grid;gap:4px}
.internal-chat-member-eyebrow{color:var(--green-700);font-size:8px;font-weight:800;letter-spacing:.9px}
.internal-chat-member-heading strong{font-size:13px}
.internal-chat-member-total{min-width:30px;height:30px;display:grid;place-items:center;border-radius:50%;background:var(--green-900);color:#fff;font-size:11px;font-weight:700}
.internal-chat-member-description{margin:6px 0 12px;color:var(--muted);font-size:10px;line-height:1.45}
.internal-chat-member-filters{display:grid;grid-template-columns:minmax(0,1fr) minmax(155px,.46fr);gap:9px}
.internal-chat-member-filters label{min-width:0;display:grid;gap:5px}
.internal-chat-member-filters label>span{color:#59665f;font-size:9px;font-weight:700}
.internal-chat-member-filters input,.internal-chat-member-filters select{width:100%;height:38px;padding:0 10px;border:1px solid var(--line);border-radius:7px;outline:0;background:var(--surface);color:var(--ink);font-size:10px;transition:border-color .15s,box-shadow .15s}
.internal-chat-member-filters input:focus,.internal-chat-member-filters select:focus{border-color:var(--green-700);box-shadow:0 0 0 3px rgba(47,115,87,.09)}
.internal-chat-selected-members{display:grid;gap:6px;margin-top:12px}
.internal-chat-selected-members>span{color:var(--muted);font-size:8px;font-weight:800;letter-spacing:.65px}
.internal-chat-selected-members>div{display:flex;flex-wrap:wrap;gap:5px}
.internal-chat-member-chip{display:inline-flex;align-items:center;gap:5px;max-width:100%;padding:4px 5px 4px 9px;border:1px solid #d5e7dc;border-radius:20px;background:var(--green-50);color:var(--green-900);font-size:9px}
.internal-chat-member-chip button{width:17px;height:17px;display:grid;place-items:center;border-radius:50%;background:transparent;color:var(--green-700);font-size:14px;line-height:1}
.internal-chat-member-chip button:hover{background:#dcece4}
.internal-chat-member-results{display:flex;align-items:center;justify-content:space-between;margin:13px 0 6px;color:#526159;font-size:9px;font-weight:700}
.internal-chat-member-results small{color:var(--muted);font-size:8px;font-weight:500}
.internal-chat-member-list{min-height:70px;max-height:min(28vh,235px);flex:1;overflow:auto;border:1px solid var(--line);border-radius:8px;background:var(--surface)}
.internal-chat-member-option{min-height:58px;display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid #edf0ed;cursor:pointer;transition:background .12s}
.internal-chat-member-option:last-child{border-bottom:0}
.internal-chat-member-option:hover,.internal-chat-member-option.is-selected{background:var(--green-50)}
.internal-chat-member-option input{width:15px;height:15px;flex:0 0 auto;accent-color:var(--green-700)}
.internal-chat-member-avatar{width:34px;height:34px;display:grid;place-items:center;flex:0 0 auto;border-radius:50%;background:#e8efeb;color:var(--green-900);font-size:10px;font-weight:700}
.internal-chat-member-option.is-selected .internal-chat-member-avatar{background:#d7eadf}
.internal-chat-member-info{min-width:0;flex:1}
.internal-chat-member-info strong,.internal-chat-member-info small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.internal-chat-member-info strong{color:var(--ink);font-size:10px}
.internal-chat-member-info small{margin-top:3px;color:var(--muted);font-size:9px}
.internal-chat-member-role-tag{max-width:115px;overflow:hidden;padding:4px 7px;border-radius:20px;background:#f0f3f1;color:#59675f;font-size:8px;text-overflow:ellipsis;white-space:nowrap}
.internal-chat-member-empty-state{min-height:125px;display:grid;align-content:center;justify-items:center;gap:6px;padding:15px;text-align:center}
.internal-chat-member-empty-state>span{width:34px;height:34px;display:grid;place-items:center;border-radius:50%;background:var(--green-50);color:var(--green-700)}
.internal-chat-member-empty-state strong{font-size:10px}
.internal-chat-member-empty-state small{max-width:250px;color:var(--muted);font-size:9px;line-height:1.4}
.internal-chat-member-loading{min-height:100px;display:flex;align-items:center;justify-content:center;gap:9px;color:var(--muted);font-size:10px}
.internal-chat-member-loading>span{width:15px;height:15px;border:2px solid var(--green-100);border-top-color:var(--green-700);border-radius:50%;animation:internal-chat-spin .8s linear infinite}
@keyframes internal-chat-spin{to{transform:rotate(360deg)}}
.internal-chat-member-footnote{margin:9px 0 0;color:var(--muted);font-size:9px}
.internal-chat-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;padding-top:12px}
.internal-chat-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%);white-space:nowrap}
@media(max-width:760px){
  .internal-chat{width:100%;height:calc(100dvh - 124px);min-height:440px;grid-template-columns:minmax(0,1fr);border-radius:12px}
  .internal-chat-sidebar{width:100%;height:100%;max-height:none;min-height:0;border:0}
  .internal-chat.is-mobile-chat-open .internal-chat-sidebar{display:none}
  .internal-chat.is-mobile-list-open .internal-chat-conversation{display:none}
  .internal-chat-brand{height:58px;padding:0 14px}
  .internal-chat-profile{display:none}
  .internal-chat-list-heading{margin:16px 16px 10px}
  .internal-chat-list-heading small{font-size:9px}
  .internal-chat-list-heading h2{font-size:18px}
  .internal-chat-search{margin:0 13px 8px}
  .internal-chat-search input{height:40px;font-size:12px}
  .internal-chat-list{display:flex;min-height:0;flex:1;flex-direction:column;gap:5px;overflow-x:hidden;overflow-y:auto;padding:4px 9px 12px}
  .internal-chat-item{width:100%;min-width:0;min-height:70px;flex:0 0 auto;gap:11px;padding:10px;border:1px solid transparent;border-radius:10px}
  .internal-chat-item:hover,.internal-chat-item.is-selected{border-color:#dfeae3;background:var(--green-50)}
  .internal-chat-item.is-selected{box-shadow:inset 3px 0 var(--green-700)}
  .internal-chat-item-icon{width:42px;height:42px}
  .internal-chat-item-copy strong{font-size:12px}
  .internal-chat-item-copy small{margin-top:5px;font-size:10px}
  .internal-chat-closed-tag{font-size:9px}
  .internal-chat-empty-list{min-width:0;padding:28px 12px}
  .internal-chat-empty-list p{font-size:12px}
  .internal-chat-empty-list button{font-size:12px}
  .internal-chat-status{height:36px;display:flex;padding:0 15px;font-size:10px}
  .internal-chat-conversation{width:100%;height:100%;min-height:0;overflow:hidden;background:var(--canvas)}
  .internal-chat-conversation-header{min-height:68px;display:grid;grid-template-columns:minmax(0,1fr);gap:8px;padding:9px 12px}
  .internal-chat-conversation-title{gap:8px}
  .internal-chat-mobile-back{width:32px;height:36px;display:grid;place-items:center;flex:0 0 auto;border-radius:8px;background:var(--canvas);color:var(--green-900);font-size:22px}
  .internal-chat-title-icon{width:34px;height:34px}
  .internal-chat-conversation-title>div{min-width:0;flex:1}
  .internal-chat-conversation-title h1{max-width:none;font-size:13px}
  .internal-chat-conversation-title p{max-width:100%;overflow:hidden;margin-top:3px;font-size:9px;text-overflow:ellipsis;white-space:nowrap}
  .internal-chat-actions{min-width:0;justify-content:flex-end;gap:6px}
  .internal-chat-connection{padding:5px 8px;font-size:9px}
  .internal-chat-action-button{min-height:29px;padding:0 8px;font-size:9px}
  .internal-chat-messages{min-height:0;flex:1;gap:11px;overflow-x:hidden;overflow-y:auto;padding:14px 11px;background:var(--canvas)}
  .internal-chat-message{max-width:88%;padding:9px 11px;border-radius:12px}
  .internal-chat-message.is-own{border-radius:12px 4px 12px 12px}
  .internal-chat-message.is-other{border-radius:4px 12px 12px}
  .internal-chat-message-meta strong{font-size:10px}
  .internal-chat-message-meta time{font-size:8px}
  .internal-chat-message-text{font-size:12px}
  .internal-chat-attachment{width:100%;min-width:0}
  .internal-chat-attachment strong{overflow-wrap:anywhere}
  .internal-chat-composer{width:100%;padding:8px 10px max(8px,env(safe-area-inset-bottom));border-top:1px solid var(--line)}
  .internal-chat-message-form{align-items:center;gap:6px;padding:5px 6px 5px 10px;border-radius:22px;background:var(--canvas)}
  .internal-chat-message-form textarea{min-height:38px;max-height:92px;padding:9px 2px;font-size:12px}
  .internal-chat-send{height:36px;min-width:58px;padding:0 10px;border-radius:18px;font-size:10px}
  .internal-chat-attachment-form{min-height:29px;gap:8px;padding:7px 3px 0}
  .internal-chat-file-picker{max-width:70%;font-size:10px}
  .internal-chat-caption{min-width:0;flex-basis:100%;font-size:10px}
  .internal-chat-upload{font-size:10px}
  .internal-chat-attachment-form>small{font-size:9px}
  .internal-chat-closed-notice{min-height:48px;font-size:10px}
  .internal-chat-alert,.internal-chat-notice{padding:8px 11px;font-size:10px}
  .internal-chat-dialog-backdrop{padding:10px}
  .internal-chat-dialog,.internal-chat-dialog.is-creating{width:100%;max-height:94dvh;padding:17px;border-radius:12px}
  .internal-chat-member-picker{padding:11px}
  .internal-chat-member-filters{grid-template-columns:1fr}
  .internal-chat-member-list{max-height:25dvh}
  .internal-chat-member-role-tag{max-width:92px}
}
`;

export function ChatInternoStyles() {
  useEffect(() => {
    const style = document.createElement("style");
    style.dataset.feature = "chat-interno";
    style.textContent = stylesheet;
    document.head.append(style);
    return () => style.remove();
  }, []);
  return null;
}
