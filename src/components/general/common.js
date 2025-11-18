import axios from 'axios';

// General API Request method
const apiRequest = async (method, url, data,params, onSuccess, onError) => {
  try {
    
    const response = await axios({
      method: method,
      maxBodyLength: Infinity,
      url: url,
      headers: {
        "Content-Type": "application/json",
        "Authorization":`Bearer ${localStorage.getItem('user')}`
        
      },
      params:params,
      data: data,
    });
    console.log('Response:', response.data); //show response on the console
    onSuccess(response.data);
  } catch (error) {
    // onError(error);
    console.error('Error:', error);
  }
};


export default apiRequest;
 