// authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { API_BASE_URL } from "../../general/constants";


// defining login async thunk for login action [login action] which can be exported
// as loginUser
export const loginUser = createAsyncThunk(
  "auth/login",
  async (userData, { dispatch }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}auth/login`, userData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
);

// NEW: Refresh current user from auth/me without affecting session
export const refreshCurrentUser = createAsyncThunk(
  "auth/refreshCurrentUser",
  async (_, { getState }) => {
    // Read from redux state first, fall back to localStorage for token retrieval
    const { user } = getState().auth;
    const token = user?.data?.access_token || localStorage.getItem("access_token");


    const [meResponse, rolesResponse] = await Promise.all([
       //Call the endpoint that actually returns the user data, 
    // which is /auth/me, and pass the token in the header
      axios.post(`${API_BASE_URL}auth/me`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      }),
       // auth/me doesn't return roles[] and they are needed to create acomplete 
    // auth state like that of login so we fetch them separately
      axios.get(`${API_BASE_URL}roles/all_roles`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    //get user data from auth/me endpoint
    const meUser = meResponse.data;
    //access roles from separate endpoint 
     const allRoles = rolesResponse.data.roles || rolesResponse.data;

    // Reconstruct roles[] array like login response has, using role_id from /me
    const userRoleIds = Array.isArray(meUser.role_id)
      ? meUser.role_id.map(Number)
      : [Number(meUser.role_id)];

    const userRoles = allRoles
      .filter((r) => userRoleIds.includes(Number(r.id)))
      .map((r) => ({ id: r.id, display_name: r.display_name }));

    // Return shaped to match what login response puts in state.auth.user
    // state.auth.user = the full login response, so we patch just the user object
    return { ...meUser, roles: userRoles, role_id: userRoleIds };
  }
);


// Define refreshToken async thunk [an action that refreshes the user token]
export const refreshToken = createAsyncThunk(
  "auth/refreshToken",
  async (_, { getState }) => {
    try {
      const { user } = getState().auth;
      const accessToken = user?.data?.access_token;
      if (!accessToken) {
        throw new Error("Access token not found");
      }

      const response = await axios.post(
        `${API_BASE_URL}auth/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // Update the user token in the Redux state
      const newToken = response.data.token;
      return newToken;
    } catch (error) {
      throw error;
    }
  }
);

// Define logout async thunk [an action that logs out the user]
export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { getState }) => {
    try {
      const { user } = getState().auth;
      const accessToken = user?.data?.access_token;
      if (!accessToken) {
        throw new Error("Access token not found");
      }

      await axios.post(`${API_BASE_URL}auth/logout`, null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return null; // Return null after successful logout
    } catch (error) {
      throw error;
    }
  }
);



// creating an auth reducer from the actions above and after we export it as an authReducer
// through authSlice.reducer
const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Handle loginUser async thunk states
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })

      // Handle refreshCurrentUser async thunk states
      // such state will be used when ie certain actions that dont need the user to login again
      // such as reassigning user role, or profile such that they are dispatched again
      .addCase(refreshCurrentUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(refreshCurrentUser.fulfilled, (state, action) => {
        state.status = "succeeded";

        if (state.user?.data?.user) {
          // on refreshing current user
          // Surgically update only the user fields, [preserving token & plan]
          // in auth/user/data/user path in redux state, 
          // we have the user data, so we patch just that part of the state with the new user data from refreshCurrentUser action payload
          state.user.data.user = {
            ...state.user.data.user,
            ...action.payload,
          };
        }
      })
      .addCase(refreshCurrentUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })

      //handle logoutUser async thunk states
      .addCase(logoutUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.status = "idle";
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })

      //Handle refreshToken async thunk states
      .addCase(refreshToken.pending, (state) => {
        state.status = "loading";
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });

    //Handle refreshCurrentUser async thunk states

  },
});

export default authSlice.reducer;
