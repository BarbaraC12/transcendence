import { Dispatch, SetStateAction, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameStatusContext } from '../../../contexts/GameStatusContext';
import { GameStatus } from '../game.interface';
import { WebSocketContext } from '../../../contexts/WebsocketContext';
import SliderPong from './SliderPong';
import errorAlert from '../../UI/errorAlert';
import Modal from '@mui/joy/Modal';
import ModalClose from '@mui/joy/ModalClose';
import ModalDialog from '@mui/joy/ModalDialog';
import Stack from '@mui/material/Stack';
import Typography from '@mui/joy/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import SwitchPong from './SwitchPong';
import FormControlLabel from '@mui/material/FormControlLabel';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import * as MUI from '../../UI/MUIstyles';
import * as color from '../../UI/colorsPong';

const DEFAULT_WIN_SCORE = 5;

const InvitationSendModal = ({
  open,
  setOpen,
  nickname,
  id,
}: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  nickname? : string;
  id?: number;
}) => {
  const navigate = useNavigate();
  const { setGameStatus } = useContext(GameStatusContext);
  const socket = useContext(WebSocketContext);
  const [obstacleEnabled, setObstacleEnabled] = useState(false);
  const [winScore, setWinScore] = useState(DEFAULT_WIN_SCORE);
  const [disabledOptions, setDisabledOptions] = useState(false);
  const [disabledButton, setDisabledButton] = useState(false);
  const [buttonText, setButtonText] = useState('Invite');
  const [loading, setLoading] = useState(false);
  const [invitationSent, setInvitationSent] = useState(false);

  const setDefault = () => {
    setObstacleEnabled(false);
    setWinScore(DEFAULT_WIN_SCORE);
    setDisabledOptions(false);
    setDisabledButton(false);
    setButtonText('Invite');
    setLoading(false);
  };

  const toggleObstacle = () => {
    setObstacleEnabled((prev) => !prev);
  };

  const sendInvitation = () => {
    return new Promise(async (resolve, reject) => {
      socket.emit(
        'match_send_invitation',
        {
          winScore: winScore,
          obstacle: obstacleEnabled,
          id : id,
          nickname : nickname,
        },
        (response: any) => {
          if (response.status === 200) {
            resolve(response);
            setInvitationSent(true);
          } else if (response.status === 400) {
            reject((response.error = `${nickname} is occupied`));
          } else if (response.status === 404) {
            reject(
              (response.error = `Player with nickname "${nickname}" was not found`)
            );
          } else if (response.status === 429) {
            reject((response.error = 'Invitation is already sent'));
          } else if (response.status === 406) {
            reject((response.error = `${nickname} has blocked you`));
          } else {
            reject((response.error = 'Something went wrong'));
          }
        }
      );
    });
  };

  const handleSubmit = async (event: any) => {
    event.preventDefault();
    setDisabledOptions(true);
    setLoading(true);
    await sendInvitation()
      .then((data) => {
        setLoading(false);
        setButtonText('Awaiting');
        setDisabledButton(true);
        setLoading(true);
      })
      .catch((error) => {
        setDefault();
        setOpen(false);
        errorAlert(error);
      });
  };

  const cancelInvitation = () => {
    if (invitationSent) {
      socket.emit('match_invitation_cancel', {
        nickname: nickname
      });
    }
  };

  socket.on('invitation_accepted', (args) => {
    setButtonText('Accepted');
    setLoading(false);
    setOpen(false);
    navigate('/game');
    setGameStatus(GameStatus.BEGIN_GAME);
  });

  socket.on('invitation_refused', (args) => {
    setOpen(false);
    setDefault();
    errorAlert(`${nickname} refused your invitation`);
  });

  return (
    <div>
      <Modal
        sx={{ color: 'black' }}
        open={open}
        onClose={(event, reason) => {
          if (event && reason === 'closeClick') {
            cancelInvitation();
            setDefault();
            setOpen(false);
          }
        }}
      >
        <ModalDialog
          aria-labelledby="basic-modal-dialog-title"
          sx={MUI.modalDialog}
        >
          <ModalClose sx={MUI.modalClose} />
          <Typography id="basic-modal-dialog-title" sx={MUI.modalHeader}>
            Setting up custom game
          </Typography>
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <div>
                <Typography
                  component="h3"
                  sx={{
                    textAlign: 'left',
                    paddingBottom: '10px',
                    paddingTop: '15px',
                    color: color.PONG_BLUE
                  }}
                >
                  Define if obstacle is available:
                </Typography>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: '11px',
                    justifyContent: 'center'
                  }}
                >
                  <FormControlLabel
                    title="Add additional moving obstacle to the game"
                    control={
                      <SwitchPong
                        checked={obstacleEnabled}
                        disabled={disabledOptions}
                        onClick={() => toggleObstacle()}
                      />
                    }
                    label=""
                    labelPlacement="bottom"
                  />
                </div>
              </div>

              <div>
                <Typography
                  component="h3"
                  sx={{
                    textAlign: 'left',
                    paddingBottom: '30px',
                    color: color.PONG_BLUE
                  }}
                >
                  Define the win score:
                </Typography>
                <div
                  style={{
                    marginLeft: '15px',
                    marginRight: '15px'
                  }}
                >
                  <SliderPong
                    disabled={disabledOptions}
                    setWinScore={setWinScore}
                  />
                </div>
              </div>

              <div>
                <Typography
                  component="h3"
                  sx={{
                    textAlign: 'left',
                    paddingBottom: '10px',
                    paddingTop: '15px',
                    color: color.PONG_BLUE
                  }}
                >
                  Send invitation and wait for response:
                </Typography>
                <div style={MUI.loadButtonBlock}>
                  <LoadingButton
                    type="submit"
                    title={`Invite ${nickname} to play game`}
                    loading={loading}
                    loadingPosition="end"
                    endIcon={
                      buttonText === 'Accepted' ? (
                        <CheckCircleOutlineIcon />
                      ) : (
                        <SendIcon />
                      )
                    }
                    variant="contained"
                    color="inherit"
                    disabled={disabledButton}
                    sx={{ minWidth: 142 }}
                  >
                    {buttonText}
                  </LoadingButton>
                </div>
              </div>
              <Typography
                sx={{
                  textAlign: 'left',
                  fontSize: '14px'
                }}
              >
                * closing this popup will cancel the invitation
              </Typography>
            </Stack>
          </form>
        </ModalDialog>
      </Modal>
    </div>
  );
};

export default InvitationSendModal;
