// rolesSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { API_BASE_URL } from '../../general/constants';

//Creating an action that fetches User roles 
export const fetchUserRoles = createAsyncThunk('/all_roles', async (_, { getState }) => {
  try {
      const { user } = getState().auth;             //use user state 'auth'
      const accessToken = user?.data?.access_token; //get user accessToken [redux store]
      const response = await axios.get(`${API_BASE_URL}roles/all_roles`, { //fetch all zones
          headers: {
              Authorization: `Bearer ${accessToken}`,
          },
      });
      return response.data.roles; //context from an api
  } catch (error) {

      throw error;
  }
});

//creating areducer which takes in the action above 
const roleSlice = createSlice({
  name: "roles",
  initialState: {
    roles: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserRoles.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchUserRoles.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.roles = action.payload;
      })
      .addCase(fetchUserRoles.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

//finally exporting the reducer,to be used in the redux store
export default roleSlice.reducer;
