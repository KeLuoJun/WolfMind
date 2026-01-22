import { ref, watch } from "vue";

const MAX_FEED_ITEMS = 200;

const generateId = (prefix = "item") => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const eventToMessage = (evt, getAgentById) => {
  if (!evt || !evt.type) {
    return null;
  }

  const agent = typeof getAgentById === "function" ? getAgentById(evt.agentId) : null;
  const timestamp = evt.timestamp || evt.ts || Date.now();

  switch (evt.type) {
  case "agent_message":
  case "conference_message": {
    const thought = evt.thought || "";
    const behavior = evt.behavior || "";
    const speech = evt.speech || "";
    const content = evt.content || speech || "";

    return {
      id: generateId("msg"),
      timestamp,
      agentId: evt.agentId,
      agent: agent?.name || evt.agentName || evt.agentId || "Agent",
      role: evt.role || agent?.role || "Agent",
      content,
      thought,
      behavior,
      speech,
      category: evt.category,
      action: evt.action,
    };
  }

  case "memory":
    return {
      id: generateId("memory"),
      timestamp,
      agentId: evt.agentId,
      agent: agent?.name || evt.agentId || "Memory",
      role: "Memory",
      content: evt.content || evt.text || "",
    };

  case "system":
  case "day_start":
  case "night_start":
  case "round_start":
  case "day_complete":
  case "day_error":
    return {
      id: generateId("sys"),
      timestamp,
      agent: "System",
      role: "System",
      content: evt.content || `${evt.type}: ${evt.date || ""}`,
    };

  default:
    return null;
  }
};

const eventToFeedItem = (evt, getAgentById) => {
  if (!evt || !evt.type) {
    return null;
  }

  const message = eventToMessage(evt, getAgentById);
  if (!message) {
    return null;
  }

  if (evt.type === "memory") {
    return {
      type: "memory",
      id: message.id,
      data: {
        timestamp: message.timestamp,
        agentId: message.agentId,
        agent: message.agent,
        content: message.content,
      },
    };
  }

  return {
    type: "message",
    id: message.id,
    data: message,
  };
};

export function useFeedProcessor({ getAgentById } = {}) {
  const feed = ref([]);

  const getAgentByIdRef = ref(getAgentById);
  watch(
    () => getAgentById,
    (val) => {
      getAgentByIdRef.value = val;
    }
  );

  const activeConferenceRef = ref(null);

  const processHistoricalFeed = (events) => {
    if (!Array.isArray(events)) {
      console.warn("processHistoricalFeed: expected array, got", typeof events);
      return;
    }

    const feedItems = [];
    let currentConference = null;
    const chronological = [...events].reverse();

    for (const evt of chronological) {
      if (!evt || !evt.type) {
        continue;
      }

      try {
        if (evt.type === "conference_start") {
          currentConference = {
            id: evt.conferenceId || generateId("conf"),
            title: evt.title || "Team Conference",
            startTime: evt.timestamp || evt.ts || Date.now(),
            endTime: null,
            isLive: false,
            participants: evt.participants || [],
            messages: [],
          };
        } else if (evt.type === "conference_end") {
          if (currentConference) {
            currentConference.endTime = evt.timestamp || evt.ts || Date.now();
            currentConference.isLive = false;
            feedItems.push({
              type: "conference",
              id: currentConference.id,
              data: currentConference,
            });
            currentConference = null;
          }
        } else if (evt.type === "conference_message") {
          const message = eventToMessage(evt, getAgentByIdRef.value);
          if (message && currentConference) {
            currentConference.messages.push(message);
          } else if (message) {
            feedItems.push({
              type: "message",
              id: message.id,
              data: message,
            });
          }
        } else {
          const feedItem = eventToFeedItem(evt, getAgentByIdRef.value);
          if (feedItem) {
            if (currentConference) {
              currentConference.messages.push(feedItem.data);
            } else {
              feedItems.push(feedItem);
            }
          }
        }
      } catch (error) {
        console.error("Error processing historical event:", evt.type, error);
      }
    }

    if (currentConference) {
      currentConference.isLive = true;
      feedItems.push({
        type: "conference",
        id: currentConference.id,
        data: currentConference,
      });
      activeConferenceRef.value = currentConference;
    }

    feed.value = feedItems.reverse();
  };

  const processFeedEvent = (evt) => {
    if (!evt || !evt.type) {
      return null;
    }

    if (evt.type === "conference_start") {
      const conference = {
        id: evt.conferenceId || generateId("conf"),
        title: evt.title || "Team Conference",
        startTime: evt.timestamp || evt.ts || Date.now(),
        endTime: null,
        isLive: true,
        participants: evt.participants || [],
        messages: [],
      };
      activeConferenceRef.value = conference;
      feed.value = [{ type: "conference", id: conference.id, data: conference }, ...feed.value].slice(0, MAX_FEED_ITEMS);
      return conference;
    }

    if (evt.type === "conference_end") {
      const activeConf = activeConferenceRef.value;
      activeConferenceRef.value = null;

      if (activeConf) {
        const ended = {
          ...activeConf,
          endTime: evt.timestamp || evt.ts || Date.now(),
          isLive: false,
        };
        feed.value = feed.value.map((item) =>
          item.type === "conference" && item.id === activeConf.id ? { ...item, data: ended } : item
        );
        return ended;
      }
      return null;
    }

    if (evt.type === "conference_message") {
      const message = eventToMessage(evt, getAgentByIdRef.value);
      if (!message) {
        return null;
      }

      const activeConf = activeConferenceRef.value;
      if (activeConf) {
        const updated = {
          ...activeConf,
          messages: [...activeConf.messages, message],
        };
        activeConferenceRef.value = updated;
        feed.value = feed.value.map((item) =>
          item.type === "conference" && item.id === activeConf.id ? { ...item, data: updated } : item
        );
        return message;
      }

      const feedItem = { type: "message", id: message.id, data: message };
      feed.value = [feedItem, ...feed.value].slice(0, MAX_FEED_ITEMS);
      return feedItem;
    }

    const feedEventTypes = [
      "agent_message",
      "memory",
      "system",
      "day_start",
      "night_start",
      "round_start",
      "day_complete",
      "day_error",
    ];
    if (!feedEventTypes.includes(evt.type)) {
      return null;
    }

    const feedItem = eventToFeedItem(evt, getAgentByIdRef.value);
    if (!feedItem) {
      return null;
    }

    const activeConf = activeConferenceRef.value;
    if (activeConf) {
      const updated = {
        ...activeConf,
        messages: [...activeConf.messages, feedItem.data],
      };
      activeConferenceRef.value = updated;
      feed.value = feed.value.map((item) =>
        item.type === "conference" && item.id === activeConf.id ? { ...item, data: updated } : item
      );
      return feedItem.data;
    }

    feed.value = [feedItem, ...feed.value].slice(0, MAX_FEED_ITEMS);
    return feedItem;
  };

  const addSystemMessage = (content) => {
    const message = {
      id: generateId("sys"),
      timestamp: Date.now(),
      agent: "System",
      role: "System",
      content: content || "",
    };

    const feedItem = {
      type: "message",
      id: message.id,
      data: message,
    };

    feed.value = [feedItem, ...feed.value].slice(0, MAX_FEED_ITEMS);
  };

  return {
    feed,
    processHistoricalFeed,
    processFeedEvent,
    addSystemMessage,
  };
}
