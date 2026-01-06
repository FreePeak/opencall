import axios from "axios";

import { MESSAGE, TYPE } from "../constants";
import { generateArrayObjectFromData } from "./index";
import { IRequestData, IUserRequestSidebarState } from "./type";

async function generateResponseObject(
  configuration: IUserRequestSidebarState | IRequestData | undefined,
) {
  if (!configuration) return;

  const sentTime = new Date().getTime();

  try {
    // Cast configuration to AxiosRequestConfig to satisfy axios type requirements
    const response = await axios(configuration as import('axios').AxiosRequestConfig);

    const receivedTime = new Date().getTime();
    const totalRequestTime = receivedTime - sentTime;
    const headersSize = Object.keys(response.headers).length;
    const headersArray = generateArrayObjectFromData(response.headers as Record<string, string>);

    if (typeof response.data === "object") {
      response.data = JSON.stringify(response.data, null, 2);
    }

    const responseDataObject = {
      type: TYPE.RESPONSE,
      data: response.data,
      headers: headersArray,
      headersLength: headersSize,
      statusCode: response.status,
      statusText: response.statusText,
      requestTime: totalRequestTime,
      responseSize: 0,
    };

    responseDataObject.responseSize = Buffer.from(
      JSON.stringify(responseDataObject),
    ).length;

    return responseDataObject;
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      error.response
    ) {
      const err = error as {
        response: {
          headers: Record<string, string>;
          data: unknown;
          status: number;
        };
        message: string;
        request?: unknown;
      };
      const receivedTime = new Date().getTime();
      const totalRequestTime = receivedTime - sentTime;

      const headersSize = Object.keys(err.response.headers).length;
      const headersArray = generateArrayObjectFromData(err.response.headers as Record<string, string>);

      const errorResponseData = typeof err.response.data === 'object' 
        ? JSON.stringify(err.response.data, null, 2)
        : err.response.data;

      const errorObject = {
        type: TYPE.RESPONSE,
        data: errorResponseData,
        headers: headersArray,
        headersLength: headersSize,
        statusCode: err.response.status,
        statusText: MESSAGE.NOT_FOUND,
        requestTime: totalRequestTime,
        responseSize: 0,
      };

      errorObject.responseSize = Buffer.from(
        JSON.stringify(errorObject),
      ).length;

      return errorObject;
    } else if (
      typeof error === 'object' &&
      error !== null &&
      'request' in error &&
      error.request &&
      'message' in error
    ) {
      const err = error as { message: string };
      const errorObject = {
        type: MESSAGE.ERROR,
        message: err.message,
      };

      return errorObject;
    } else if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error
    ) {
      const err = error as { message: string };
      const errorObject = {
        type: MESSAGE.ERROR,
        message: err.message,
      };

      return errorObject;
    } else {
      return {
        type: MESSAGE.ERROR,
        message: 'Unknown error',
      };
    }
  }
}

export default generateResponseObject;
