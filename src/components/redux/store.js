// store.js
// Just like we do define reducers as methods which takes in anew action and updates the store 
// with anew state,here we are adding or updating the store with these reducers

import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";

//Importing all reducers into the redux store
import authReducer from "./slice/authSlice";
import roleReducer from "./slice/rolesSlice";



const persistConfig = {
  key: "root",
  version: 1,
  storage,
};

//combining all reducers  from different slices using the rootReducer function
const rootReducer = combineReducers({
  auth: authReducer,
  roles: roleReducer,
});

//passing the rootReducer as an argumant in aparameter
const persistedReducer = persistReducer(persistConfig, rootReducer);

//Storing all our reducers into the redux store by applying middleware to
// provide extra functionality
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

//exporting our complete store,it will be used in aour react application
//by passing it as aprop in the provider as away of connecting the react app to it 
export const persistor = persistStore(store);
export default store;
