import { SetStateAction, useContext, useEffect, useState } from 'react';
import { WebSocketContext } from '../../contexts/WebsocketContext';
import {
  Send,
  Delete,
  ArrowBackIosNew,
  PersonAdd,
  Settings,
  PersonAddAlt,
  Password,
  ExitToApp
} from '@mui/icons-material';
import {
  Box,
  Button,
  Divider,
  FormControl,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Typography
} from '@mui/material';

import timeFromNow from './utils/GetTime';
import './Chat.css';

// // All newly created message should have an author and the message itself
// export type MessagePayload = {
// 	author: string
// 	data: string
// 	timestamp: Date
// }

/*************************************************************
 * Chat room
 
 * Represents each created chat room 
**************************************************************/

const ChatRoom = (props: any) => {
  /*************************************************************
   * States
   **************************************************************/
  const socket = useContext(WebSocketContext);

  // Array including all message objects (author + msg)
  const [messages, setMessages] = useState<any[]>([]);
  // Display typing state of the user
  const [typingDisplay, setTypingDisplay] = useState<string>('');

  // Message input field value
  const [messageText, setMessageText] = useState<string>('');

  // Get all messages from messages array in chat.service and fill the messages variable
  socket.emit(
    'findAllMessages',
    { roomName: props.room.name },
    (response: SetStateAction<any[]>) => {
      setMessages(response);
    }
  );

  /*************************************************************
   * Event listeners
   **************************************************************/
  useEffect(() => {
    socket.on('connect', () => console.log('connected to websocket!'));
    socket.on('createMessage', (newMessage: any) =>
      console.log('createMessage event received!')
    );
    socket.on('typingMessage', ({ roomName, nickname, isTyping }) => {
      roomName === props.room.name && isTyping
        ? setTypingDisplay(nickname + ' is typing...')
        : setTypingDisplay('');
    });

    // Clean listeners to avoid multiple activations
    return () => {
      socket.off('connect');
      socket.off('createMessage');
      socket.off('typingMessage');
    };
  }, []);

  // Emit that user is typing, or not typing after timeout
  let timeout;
  const emitTyping = () => {
    socket.emit('typingMessage', { roomName: props.room.name, isTyping: true });
    timeout = setTimeout(() => {
      socket.emit('typingMessage', {
        roomName: props.room.name,
        isTyping: false
      });
    }, 2000);
  };

  // Activated whenever the user is typing on the message input field
  const onTyping = (msg: string) => {
    emitTyping();
    setMessageText(msg);
  };

  // On submit, send the nickName with the written message from the input field
  // to the backend, as a createMessage event
  const onFormSubmit = (e: any) => {
    e.preventDefault();
    if (messageText)
      socket.emit('createMessage', {
        roomName: props.room.name,
        message: {
          author: props.user.nickname,
          data: messageText,
          timestamp: new Date()
        }
      });
    // Reset input field value once sent
    setMessageText('');
  };

  // When clicking on the 'return' button
  const onReturnClick = () => {
    socket.emit('quitRoom', {
      roomName: props.room.name,
      userName: props.user.nickname
    });
    props.cleanRoomLoginData();
  };

  const listChatMessages = messages.map((msg, index) => (
    <ListItem key={index}>
      {
        props.user.nickname === msg.author ? (
          <ListItemText
            primary={`${msg.data} 
				- You`}
            id="send-msg"
          />
        ) : (
          // | ${timeFromNow(msg.timestamp)}
          <ListItemText
            primary={`${props.user.nickname} - 
				${msg.data}`}
            id="receive-msg"
          />
        )
        // ${timeFromNow(msg.timestamp)} |
      }
    </ListItem>
  ));

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  /*************************************************************
   * Render HTML response
   **************************************************************/
  return (
    <>
      <div>
        <Box>
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'center'
            }}
          >
            <IconButton style={{ paddingRight: -1 }}>
              <ArrowBackIosNew
                onClick={onReturnClick}
                sx={{ color: 'black' }}
                aria-label="return"
              />
            </IconButton>
            Lets chat here ! #{props.room.name}
            <Button
              id="basic-button"
              aria-controls="basic-menu"
              aria-haspopup="true"
              aria-expanded={Boolean(anchorEl)}
              onClick={handleClick}
            >
              <Settings sx={{ color: 'black' }} />
            </Button>
            <Menu
              id="basic-menu"
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
            >
              <MenuItem onClick={handleClose} aria-label="add friend">
                <PersonAddAlt sx={{ color: 'black' }} />
              </MenuItem>
              <MenuItem onClick={handleClose} aria-label="change password">
                <Password sx={{ color: 'black' }} />
              </MenuItem>
              <MenuItem onClick={handleClose} aria-label="delete room">
                <Delete sx={{ color: 'black' }} />
              </MenuItem>
              <MenuItem onClick={handleClose} aria-label="leave room">
                <ExitToApp sx={{ color: 'black' }} />
              </MenuItem>
            </Menu>
          </Typography>
          <Divider />
          <Grid container spacing={3}>
            <Grid
              item
              id="chat-window"
              xs={12}
              sx={{
                width: '100vw'
              }}
            >
              {messages.length === 0 ? (
                <div>No Message</div>
              ) : (
                <List id="chat-window-messages">{listChatMessages}</List>
              )}
            </Grid>
            <div className="chatRoomText">
              {
                // Display message to other users if user is currently typing
                typingDisplay && <div>{typingDisplay}</div>
              }
              <Grid item xs={10}>
                <FormControl fullWidth onSubmit={onFormSubmit}>
                  <TextField
                    value={messageText}
                    label="Type your message here ..."
                    variant="filled" //outlined, filled, standard
                    multiline={false}
                    onChange={(e: any) => onTyping(e.target.value)}
                    onKeyPress={(ev) => {
                      if (ev.key === 'Enter') {
                        onFormSubmit(ev);
                      }
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={1}>
                <IconButton
                  color="primary"
                  aria-label="send"
                  onClick={onFormSubmit}
                >
                  <Send />
                </IconButton>
              </Grid>
            </div>
          </Grid>
        </Box>
      </div>
    </>
  );
};

export default ChatRoom;
