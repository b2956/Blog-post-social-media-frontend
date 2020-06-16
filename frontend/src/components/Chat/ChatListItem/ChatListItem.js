import React from 'react';

import Button from '../../Button/Button';
import './ChatListItem.css';

const chatListItem = props => (
  <article className="chat-list-item">
    <h2>{props.userName}</h2>
    <Button mode="flat" link={`/chat/${props.userId}`}>Chat</Button>
  </article>
);

export default chatListItem;
