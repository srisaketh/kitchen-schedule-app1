import React, { useState, useEffect } from 'react';

const KitchenScheduleApp = () => {
  const [appState, setAppState] = useState('landing');
  const [groups, setGroups] = useState({});
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [currentName, setCurrentName] = useState('');
  const [setGroupCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Detect mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('kitchenScheduleData');
    if (savedData) {
      const data = JSON.parse(savedData);
      setGroups(data.groups || {});
      if (data.currentGroupId) {
        setCurrentGroupId(data.currentGroupId);
        setCurrentName(data.currentName || '');
        setAppState('dashboard');
      }
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    if (Object.keys(groups).length > 0 || currentGroupId) {
      localStorage.setItem('kitchenScheduleData', JSON.stringify({
        groups,
        currentGroupId,
        currentName,
      }));
    }
  }, [groups, currentGroupId, currentName]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  const requestNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        new Notification('Notifications Enabled!', {
          body: 'You will receive reminders on your cooking days',
          icon: '🍳',
        });
      }
    }
  };

  const generateGroupCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createGroup = () => {
    if (!currentName.trim()) {
      alert('Please enter your name');
      return;
    }
    const newCode = generateGroupCode();
    const newGroup = {
      id: newCode,
      createdAt: new Date().toISOString(),
      members: [currentName],
      bookingsByWeek: {},
    };
    setGroups(prev => ({ ...prev, [newCode]: newGroup }));
    setCurrentGroupId(newCode);
    setGroupCode(newCode);
    setAppState('dashboard');
  };

  const joinGroup = () => {
    if (!currentName.trim()) {
      alert('Please enter your name');
      return;
    }
    if (!joinCode.trim()) {
      alert('Please enter a group code');
      return;
    }
    const upperCode = joinCode.toUpperCase();
    if (!groups[upperCode]) {
      alert('Group not found. Check the code and try again.');
      return;
    }
    if (groups[upperCode].members.includes(currentName)) {
      alert('You are already a member of this group!');
      return;
    }
    setGroups(prev => ({
      ...prev,
      [upperCode]: {
        ...prev[upperCode],
        members: [...prev[upperCode].members, currentName],
      },
    }));
    setCurrentGroupId(upperCode);
    setAppState('dashboard');
  };

  const getWeekDates = (offset = 0) => {
    const today = new Date();
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - today.getDay() + 1);
    const week = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(firstDay);
      day.setDate(firstDay.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDayName = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getWeekKey = (offset = 0) => {
    const dates = getWeekDates(offset);
    return dates[0].toISOString().split('T')[0];
  };

  const toggleBooking = (dayIndex) => {
    if (!currentGroupId) return;
    const weekKey = getWeekKey(weekOffset);
    
    setGroups(prev => {
      const group = prev[currentGroupId];
      if (!group.bookingsByWeek) {
        group.bookingsByWeek = {};
      }
      if (!group.bookingsByWeek[weekKey]) {
        group.bookingsByWeek[weekKey] = {};
      }
      
      const weekBookings = group.bookingsByWeek[weekKey];
      if (!weekBookings[currentName]) {
        weekBookings[currentName] = [];
      }

      const currentBookings = weekBookings[currentName] || [];
      const isBooked = currentBookings.includes(dayIndex);

      if (isBooked) {
        weekBookings[currentName] = currentBookings.filter(d => d !== dayIndex);
      } else {
        if (currentBookings.length >= 2) {
          alert('You can only cook 2 days per week');
          return prev;
        }
        
        const isSomeoneElseCooking = Object.entries(weekBookings).some(
          ([member, bookings]) => member !== currentName && bookings.includes(dayIndex)
        );
        
        if (isSomeoneElseCooking) {
          alert('Someone is already cooking on this day');
          return prev;
        }
        
        weekBookings[currentName] = [...currentBookings, dayIndex];
      }

      return {
        ...prev,
        [currentGroupId]: {
          ...group,
          bookingsByWeek: group.bookingsByWeek,
        },
      };
    });
  };

  const getCookersForDay = (dayIndex) => {
    if (!currentGroupId) return [];
    const weekKey = getWeekKey(weekOffset);
    const group = groups[currentGroupId];
    if (!group.bookingsByWeek || !group.bookingsByWeek[weekKey]) return [];
    
    return Object.entries(group.bookingsByWeek[weekKey])
      .filter(([name, days]) => days.includes(dayIndex))
      .map(([name]) => name);
  };

  const getCurrentWeekBookings = () => {
    if (!currentGroupId) return [];
    const weekKey = getWeekKey(weekOffset);
    const group = groups[currentGroupId];
    if (!group.bookingsByWeek || !group.bookingsByWeek[weekKey]) return [];
    return group.bookingsByWeek[weekKey][currentName] || [];
  };

useEffect(() => {
  if (notificationsEnabled && currentGroupId && weekOffset === 0) {
    const today = new Date();
    const dayOfWeek = (today.getDay() + 6) % 7;
    const currentWeekBookings = getCurrentWeekBookings();
    if (currentWeekBookings.includes(dayOfWeek)) {
      new Notification('🍳 Your Cooking Day!', {
        body: `Today is your turn to cook. Get ready!`,
        tag: 'cooking-reminder',
      });
    }
  }
}, [notificationsEnabled, currentGroupId, weekOffset, getCurrentWeekBookings]);

  if (appState === 'landing') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '20px' : '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <div style={{
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: isMobile ? '56px' : '64px',
            marginBottom: '20px',
          }}>🍳</div>
          <h1 style={{
            fontSize: isMobile ? '28px' : '32px',
            fontWeight: '700',
            color: 'white',
            margin: '0 0 12px 0',
            letterSpacing: '-0.5px',
          }}>
            Kitchen Schedule
          </h1>
          <p style={{
            fontSize: isMobile ? '14px' : '16px',
            color: '#94a3b8',
            margin: '0 0 40px 0',
            lineHeight: '1.5',
          }}>
            Coordinate cooking schedules with your roommates
          </p>

          <button
            onClick={() => setAppState('create')}
            style={{
              width: '100%',
              padding: isMobile ? '16px 20px' : '14px 20px',
              marginBottom: '12px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: isMobile ? '16px' : '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
            onMouseOver={(e) => e.target.style.background = '#2563eb'}
            onMouseOut={(e) => e.target.style.background = '#3b82f6'}
          >
            Create a Group
          </button>

          <button
            onClick={() => setAppState('join')}
            style={{
              width: '100%',
              padding: isMobile ? '16px 20px' : '14px 20px',
              background: 'transparent',
              color: '#3b82f6',
              border: '2px solid #3b82f6',
              borderRadius: '10px',
              fontSize: isMobile ? '16px' : '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#1e3a8a';
              e.target.style.borderColor = '#60a5fa';
              e.target.style.color = '#60a5fa';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.borderColor = '#3b82f6';
              e.target.style.color = '#3b82f6';
            }}
          >
            Join a Group
          </button>
        </div>
      </div>
    );
  }

  if (appState === 'create') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <div style={{
          maxWidth: '400px',
          width: '100%',
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: isMobile ? '24px' : '32px',
        }}>
          <h2 style={{
            fontSize: isMobile ? '20px' : '24px',
            fontWeight: '700',
            color: 'white',
            margin: '0 0 8px 0',
          }}>
            Create a Group
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#94a3b8',
            margin: '0 0 24px 0',
          }}>
            Start organizing your kitchen schedule
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#e2e8f0',
              marginBottom: '8px',
            }}>
              Your Name
            </label>
            <input
              type="text"
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              placeholder="Enter your name"
              style={{
                width: '100%',
                padding: isMobile ? '14px' : '12px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: 'white',
                fontSize: isMobile ? '16px' : '14px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <button
            onClick={createGroup}
            style={{
              width: '100%',
              padding: isMobile ? '14px' : '12px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: isMobile ? '16px' : '16px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '12px',
              transition: 'all 0.3s',
            }}
            onMouseOver={(e) => e.target.style.background = '#2563eb'}
            onMouseOut={(e) => e.target.style.background = '#3b82f6'}
          >
            Create Group
          </button>

          <button
            onClick={() => {
              setAppState('landing');
              setCurrentName('');
            }}
            style={{
              width: '100%',
              padding: isMobile ? '14px' : '12px',
              background: 'transparent',
              color: '#94a3b8',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (appState === 'join') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <div style={{
          maxWidth: '400px',
          width: '100%',
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: isMobile ? '24px' : '32px',
        }}>
          <h2 style={{
            fontSize: isMobile ? '20px' : '24px',
            fontWeight: '700',
            color: 'white',
            margin: '0 0 8px 0',
          }}>
            Join a Group
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#94a3b8',
            margin: '0 0 24px 0',
          }}>
            Enter the group code to join
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#e2e8f0',
              marginBottom: '8px',
            }}>
              Your Name
            </label>
            <input
              type="text"
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              placeholder="Enter your name"
              style={{
                width: '100%',
                padding: isMobile ? '14px' : '12px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: 'white',
                fontSize: isMobile ? '16px' : '14px',
                boxSizing: 'border-box',
                outline: 'none',
                marginBottom: '16px',
              }}
            />

            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#e2e8f0',
              marginBottom: '8px',
            }}>
              Group Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g., ABC123"
              style={{
                width: '100%',
                padding: isMobile ? '14px' : '12px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: 'white',
                fontSize: isMobile ? '16px' : '14px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <button
            onClick={joinGroup}
            style={{
              width: '100%',
              padding: isMobile ? '14px' : '12px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: isMobile ? '16px' : '16px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '12px',
              transition: 'all 0.3s',
            }}
            onMouseOver={(e) => e.target.style.background = '#2563eb'}
            onMouseOut={(e) => e.target.style.background = '#3b82f6'}
          >
            Join Group
          </button>

          <button
            onClick={() => {
              setAppState('landing');
              setCurrentName('');
              setJoinCode('');
            }}
            style={{
              width: '100%',
              padding: isMobile ? '14px' : '12px',
              background: 'transparent',
              color: '#94a3b8',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (appState === 'dashboard' && currentGroupId) {
    const group = groups[currentGroupId];
    const thisWeek = getWeekDates(weekOffset);
    const currentWeekBookings = getCurrentWeekBookings();
    const weekKey = getWeekKey(weekOffset);
    
    const getWeekLabel = () => {
      if (weekOffset === 0) return 'This Week';
      if (weekOffset === -1) return 'Last Week';
      if (weekOffset === -2) return '2 Weeks Ago';
      return `Week of ${thisWeek[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    };

    return (
      <div style={{
        minHeight: '100vh',
        background: '#0f172a',
        padding: isMobile ? '16px' : '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        {/* Header */}
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '0',
        }}>
          <div>
            <h1 style={{
              fontSize: isMobile ? '22px' : '28px',
              fontWeight: '700',
              color: 'white',
              margin: '0 0 4px 0',
            }}>
              🍳 Kitchen Schedule
            </h1>
            <p style={{
              fontSize: isMobile ? '12px' : '14px',
              color: '#94a3b8',
              margin: 0,
            }}>
              Group Code: <strong style={{ color: '#3b82f6' }}>{currentGroupId}</strong>
            </p>
          </div>
          <button
            onClick={requestNotifications}
            style={{
              padding: isMobile ? '10px 12px' : '10px 16px',
              background: notificationsEnabled ? '#10b981' : '#334155',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: isMobile ? '12px' : '13px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {notificationsEnabled ? '✓ On' : 'Notify'}
          </button>
        </div>

        {/* Week Navigation */}
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: isMobile ? '8px' : '12px',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            disabled={weekOffset <= -2}
            style={{
              padding: isMobile ? '8px 12px' : '10px 16px',
              background: weekOffset > -2 ? '#334155' : '#1e293b',
              color: weekOffset > -2 ? '#cbd5e1' : '#64748b',
              border: 'none',
              borderRadius: '8px',
              fontSize: isMobile ? '12px' : '13px',
              fontWeight: '600',
              cursor: weekOffset > -2 ? 'pointer' : 'not-allowed',
              opacity: weekOffset <= -2 ? 0.5 : 1,
            }}
          >
            ← {isMobile ? 'Prev' : 'Previous'}
          </button>

          <div style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: isMobile ? '8px 16px' : '10px 24px',
            minWidth: isMobile ? 'auto' : '160px',
            textAlign: 'center',
            color: '#e2e8f0',
            fontWeight: '600',
            fontSize: isMobile ? '13px' : '14px',
          }}>
            {getWeekLabel()}
          </div>

          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            disabled={weekOffset >= 0}
            style={{
              padding: isMobile ? '8px 12px' : '10px 16px',
              background: weekOffset < 0 ? '#334155' : '#1e293b',
              color: weekOffset < 0 ? '#cbd5e1' : '#64748b',
              border: 'none',
              borderRadius: '8px',
              fontSize: isMobile ? '12px' : '13px',
              fontWeight: '600',
              cursor: weekOffset < 0 ? 'pointer' : 'not-allowed',
              opacity: weekOffset >= 0 ? 0.5 : 1,
            }}
          >
            {isMobile ? 'Next' : 'Next Week'} →
          </button>
        </div>

        {/* Calendar Grid - Mobile Responsive */}
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '20px',
        }}>
          {/* Days Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${isMobile ? 4 : 7}, 1fr)`,
            background: '#334155',
            borderBottom: '1px solid #475569',
          }}>
            {(isMobile ? thisWeek.filter((_, i) => i % 2 === 0) : thisWeek).map((date, i) => (
              <div
                key={i}
                style={{
                  padding: isMobile ? '12px 8px' : '16px',
                  textAlign: 'center',
                  borderRight: i < (isMobile ? 3 : 6) ? '1px solid #475569' : 'none',
                }}
              >
                <div style={{
                  fontSize: isMobile ? '11px' : '13px',
                  fontWeight: '600',
                  color: '#cbd5e1',
                  marginBottom: '4px',
                }}>
                  {getDayName(date)}
                </div>
                <div style={{
                  fontSize: isMobile ? '13px' : '16px',
                  fontWeight: '700',
                  color: 'white',
                }}>
                  {formatDate(date)}
                </div>
              </div>
            ))}
          </div>

          {/* Day Slots */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${isMobile ? 4 : 7}, 1fr)`,
          }}>
            {thisWeek.map((date, dayIndex) => {
              if (isMobile && dayIndex % 2 !== 0) return null;
              
              const cookers = getCookersForDay(dayIndex);
              const isMyDay = currentWeekBookings.includes(dayIndex);
              const isFull = cookers.length > 0 && !isMyDay;
              const canBook = !isFull && currentWeekBookings.length < 2;
              const isCurrentWeek = weekOffset === 0;

              return (
                <button
                  key={dayIndex}
                  onClick={() => isCurrentWeek && toggleBooking(dayIndex)}
                  disabled={(isFull && !isMyDay) || !isCurrentWeek}
                  style={{
                    padding: isMobile ? '16px 12px' : '20px',
                    minHeight: isMobile ? '110px' : '140px',
                    border: '1px solid #334155',
                    background: isMyDay ? '#3b82f6' : '#0f172a',
                    cursor: (isMyDay || canBook) && isCurrentWeek ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    opacity: !isCurrentWeek && cookers.length === 0 ? 0.6 : 1,
                  }}
                  onMouseOver={(e) => {
                    if ((isMyDay || canBook) && !isFull && isCurrentWeek) {
                      e.currentTarget.style.background = isMyDay ? '#2563eb' : '#1e293b';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = isMyDay ? '#3b82f6' : '#0f172a';
                  }}
                >
                  {isMyDay ? (
                    <>
                      <div style={{ fontSize: isMobile ? '20px' : '24px', marginBottom: '8px' }}>✓</div>
                      <div style={{
                        color: 'white',
                        fontSize: isMobile ? '12px' : '14px',
                        fontWeight: '600',
                      }}>
                        Cooking
                      </div>
                    </>
                  ) : cookers.length > 0 ? (
                    <>
                      <div style={{ fontSize: isMobile ? '18px' : '20px', marginBottom: '8px' }}>🔒</div>
                      <div style={{
                        color: '#94a3b8',
                        fontSize: isMobile ? '11px' : '13px',
                      }}>
                        {cookers[0]}
                      </div>
                    </>
                  ) : isCurrentWeek ? (
                    <>
                      <div style={{ fontSize: isMobile ? '18px' : '20px', marginBottom: '8px' }}>+</div>
                      <div style={{
                        color: '#64748b',
                        fontSize: isMobile ? '11px' : '13px',
                      }}>
                        Book
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: isMobile ? '18px' : '20px', marginBottom: '8px' }}>—</div>
                      <div style={{
                        color: '#64748b',
                        fontSize: isMobile ? '11px' : '13px',
                      }}>
                        Past
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Team Info - Stack on Mobile */}
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '16px',
        }}>
          {/* Members */}
          <div style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <h3 style={{
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '700',
              color: 'white',
              margin: '0 0 12px 0',
            }}>
              Team ({group.members.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {group.members.map((member, idx) => {
                const memberWeekBookings = group.bookingsByWeek && group.bookingsByWeek[weekKey] 
                  ? (group.bookingsByWeek[weekKey][member] || []).length 
                  : 0;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px',
                      background: '#0f172a',
                      borderRadius: '8px',
                      borderLeft: member === currentName ? '3px solid #3b82f6' : '3px solid #334155',
                    }}
                  >
                    <span style={{
                      color: member === currentName ? '#3b82f6' : '#cbd5e1',
                      fontSize: isMobile ? '13px' : '14px',
                      fontWeight: member === currentName ? '600' : '500',
                    }}>
                      {member} {member === currentName && '(You)'}
                    </span>
                    <span style={{
                      background: '#334155',
                      color: '#cbd5e1',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: isMobile ? '11px' : '12px',
                      fontWeight: '600',
                    }}>
                      {memberWeekBookings} / 2
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Share Info */}
          <div style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <h3 style={{
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '700',
              color: 'white',
              margin: '0 0 12px 0',
            }}>
              Share
            </h3>
            <p style={{
              color: '#94a3b8',
              fontSize: isMobile ? '12px' : '14px',
              margin: '0 0 12px 0',
              lineHeight: '1.6',
            }}>
              Share this code with roommates:
            </p>
            <div style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: isMobile ? '10px' : '12px 16px',
              textAlign: 'center',
              marginBottom: '12px',
            }}>
              <div style={{
                fontSize: isMobile ? '20px' : '24px',
                fontWeight: '700',
                color: '#3b82f6',
                fontFamily: 'monospace',
                letterSpacing: '2px',
              }}>
                {currentGroupId}
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(currentGroupId);
                alert('Code copied!');
              }}
              style={{
                width: '100%',
                padding: isMobile ? '12px' : '10px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: isMobile ? '14px' : '13px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '8px',
              }}
            >
              Copy Code
            </button>
            <button
              onClick={() => {
                setAppState('landing');
                setCurrentGroupId(null);
                setCurrentName('');
                setWeekOffset(0);
              }}
              style={{
                width: '100%',
                padding: isMobile ? '12px' : '10px',
                background: 'transparent',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: isMobile ? '14px' : '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default KitchenScheduleApp;
