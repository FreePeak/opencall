import React from "react";

import Button from "../../../components/Button";
import useStore from "../../../store/useStore";

const RequestButton = () => {
  const requestInProcess = useStore((state) => state.requestInProcess);

  const handleSave = () => {
    // Send save message to extension
    if (typeof vscode !== 'undefined') {
      vscode.postMessage({
        command: 'saveRequest',
        requestData: {
          requestUrl: useStore.getState().requestUrl,
          requestMethod: useStore.getState().requestMethod,
          keyValueTableData: useStore.getState().keyValueTableData,
          authOption: useStore.getState().authOption,
          authData: useStore.getState().authData,
          bodyOption: useStore.getState().bodyOption,
          bodyRawOption: useStore.getState().bodyRawOption,
          bodyRawData: useStore.getState().bodyRawData,
        }
      });
    }
  };

  return (
    <>
      <Button 
        primary={false} 
        buttonType="button" 
        buttonStatus={requestInProcess}
        handleButtonClick={handleSave}
      >
        Save
      </Button>
      <Button primary buttonType="submit" buttonStatus={requestInProcess}>
        Send
      </Button>
    </>
  );
};

export default RequestButton;
