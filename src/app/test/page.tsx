'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import axios from 'axios';





export default function AdminDashboard() {
    const [user, setUser] = useState<any>(null);
    const [message, setMessage] = useState<any>("");
    const [data, setData] = useState<any>(null);

    useEffect(() => {
  const loadDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await axios.get("/api/dashboard", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      console.log("session:", session);
      console.log(res.data);
      setUser(res.data.user);
      setMessage(res.data.message);
      setData(res.data.result);

    } catch (err) {
      console.log(err);
      setMessage("Unauthorized");
    }
  };

  loadDashboard();
}, []);


  return (
    <div>
      user: {user ? user.email : "Loading..."}
      <br />
      message: {message}
      <br />
      result: {JSON.stringify(data)}
    </div>
  );
}
