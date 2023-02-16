import { useState, useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import axios from 'axios';
import LoadingButton from '@mui/lab/LoadingButton';
import SaveIcon from '@mui/icons-material/Save';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import TextField from '@mui/material/TextField';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import errorAlert from '../UI/errorAlert';

const modalDialogStyle = {
  maxWidth: 500,
  border: '0px solid #000',
  bgcolor: '#f5f5f5a6',
  borderRadius: '4px'
};

const Validate2fa = () => {
  const { user, setUser } = useContext(UserContext);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [load, setLoad] = useState(false);
  const [buttonText, setButtonText] = useState('Submit');
  const [open, setOpen] = useState(true);

  const handleTextInput = (event: any) => {
    const newValue = event.target.value;
    if (newValue.match(/[^0-9]/)) {
      setError('Only numbers acceptable');
    } else {
      setError('');
      setText(newValue);
    }
  };

  const submitCode = (value: string) => {
    console.log('la-la-la');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (text) {
      setLoad(true);
      await submitCode(text);
      setLoad(false);
      setButtonText('Done ✔️');
    }
    setText('');
    setError('');
    setTimeout(() => setOpen(false), 442);
    setTimeout(() => setButtonText('Submit'), 442);
  };

  return (
    <div>
      <Modal
        sx={{ color: 'black' }}
        open={open}
        onClose={(event, reason) => {
          if (event && reason == 'closeClick') setOpen(false);
        }}
      >
        <ModalDialog
          aria-labelledby="basic-modal-dialog-title"
          sx={modalDialogStyle}
        >
          <ModalClose />
          <Typography
            id="basic-modal-dialog-title"
            component="h2"
            sx={{ color: 'black' }}
          >
            Verifying 2FA Code
          </Typography>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <FormControl>
                <FormLabel sx={{ color: 'black' }}>6 digits:</FormLabel>
                <TextField
                  autoFocus
                  required
                  value={text}
                  inputProps={{
                    minLength: 6,
                    maxLength: 6
                  }}
                  helperText={error} // error message
                  error={!!error} // set to true to change the border/helperText color to red
                  onChange={handleTextInput}
                />
              </FormControl>
              <LoadingButton
                type="submit"
                loading={load}
                startIcon={<SaveIcon />}
                variant="contained"
                color="inherit"
              >
                {buttonText}
              </LoadingButton>
            </Stack>
          </form>
        </ModalDialog>
      </Modal>
    </div>
  );
};

export default Validate2fa;
