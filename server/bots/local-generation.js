const { randomInt } = require("node:crypto");

// Reviewed English fiction only: no student submissions, real identities,
// lyrics, external model requests, graphic violence, or personal allegations.
const library = {
  funny: {
    scenes: [
      "I waved back at someone for a full three seconds before realizing they were trying to get an automatic door to open. I committed to the wave anyway.",
      "I prepared a confident answer, opened my mouth, and thanked the empty chair beside me. Apparently my social skills were still buffering.",
      "I set five alarms to become a morning person. All I became was a person with five different reasons to be annoyed at the morning.",
      "I tried to look mysterious with my headphones on. They were not connected, so everyone got to hear my extremely dramatic playlist.",
      "I opened the fridge to remember why I walked into the kitchen. The fridge had no answers, but we held eye contact for a while.",
      "I gave myself a motivational speech in the mirror, then immediately walked into the door I was supposed to pull.",
      "I spent longer choosing a song for a five-minute task than I spent doing the task. My productivity now has an excellent soundtrack.",
      "I confidently said 'you too' to a recorded announcement. Somewhere, a speaker is probably having a wonderful day because of me.",
      "I wrote a careful to-do list, felt very accomplished, and took a break from the work I had not started.",
      "I tried to quietly open a snack during a serious moment. The wrapper decided it was time for its solo performance.",
    ],
    short: ["I waved at someone who was actually fighting an automatic door.", "My five morning alarms have formed a band called Snooze.", "My headphones disconnected halfway through my mysterious-person era.", "I opened the fridge like it owed me an explanation.", "I gave a motivational speech, then lost a fight with a pull door.", "Choosing my work playlist has become my main job.", "I said 'you too' to a recorded announcement.", "I took a break from writing my to-do list. The tasks remain theoretical."],
    details: ["I nodded like this was part of a very specific plan.", "My brain suggested moving away and starting over, which seemed excessive.", "I pretended to check my phone, even though I was looking at the calculator.", "I paused the music to process the situation. The silence made it funnier.", "I maintained a straight face for approximately half a second.", "I decided the best response was to act as if nothing unusual had happened.", "For a moment, I genuinely believed nobody had noticed.", "My confidence arrived several minutes after it was needed."],
    thoughts: ["Being the main character seems to involve much more administrative embarrassment than I expected.", "I would like to thank my imagination for making this worse every time I replay it.", "The lesson here is unclear, but the soundtrack was excellent.", "I keep asking for character development and receiving bloopers instead.", "If confidence is a skill, mine is currently on a free trial.", "There is probably a graceful way to handle this. I look forward to discovering it someday."],
    extras: ["I briefly considered explaining myself, then realized an explanation would require admitting how much thought I had put into a very small disaster.", "The rest of the day continued normally, which felt rude. Surely the universe could have paused for a second while I recovered my dignity.", "I put on a song that made me feel cool again. This worked beautifully until I remembered the exact expression I must have been making.", "My brain has already saved the moment for a surprise replay when I am trying to sleep. At least it finally remembered to back something up.", "I considered turning the whole thing into a useful life lesson. Then I remembered that I had learned absolutely nothing except how quickly I can embarrass myself.", "The good news is that I can laugh about it now. The less good news is that I laughed about it alone and immediately created a second awkward moment."],
    hopeful: ["Tomorrow I am aiming for a slightly less memorable performance.", "There is still time for my dignity to return from lunch.", "I believe in myself, with a few reasonable reservations."],
    bittersweet: ["My confidence has quietly left the group chat.", "I miss the person I was before I remembered this.", "The song ended. The embarrassment requested an encore."],
    playful: ["Please enjoy this exclusive behind-the-scenes footage of my brain.", "So much for my mysterious era.", "Anyway, I have promoted the playlist to management."],
    shortEndings: ["So much for my mysterious era.", "My dignity is on airplane mode.", "The playlist deserves a raise.", "Please respect my recovery period.", "I am choosing to call this growth.", "My brain has requested a refund."],
    songs: ["Sunday Best Surfaces", "Walking on a Dream Empire of the Sun", "Good as Hell Lizzo"],
  },
  horror: {
    scenes: [
      "The voice memo was mostly silence until I heard myself whisper 'don't turn around.' I had recorded it while I was asleep, with the phone across the room.",
      "The clock kept returning to the same minute. I took out its battery and watched the second hand begin moving backward.",
      "I heard three knocks on the bedroom door, then three more from the inside of the wardrobe. The door was already open. The wardrobe was empty.",
      "The reflection raised its hand a moment before I did. I lowered mine. It kept waving, slowly, at something standing behind me.",
      "My headphones played a quiet breathing sound between songs. I unplugged them, and the breathing continued from the empty chair beside me.",
      "I counted the steps on the staircase out of habit. There was one extra tonight, and something underneath it counted along in my voice.",
      "The message on my lock screen said to stop pretending to be asleep. My phone had been switched off since the power went out.",
      "I could hear someone humming the song I had paused. The humming stopped every time I held my breath, as if it was waiting for me to continue.",
      "Every photo of the empty hallway showed a figure getting closer. I finally lowered the camera. The hallway was still empty, but the lens was warm.",
      "There were wet footprints leading from the window to my bed. I checked the rain outside. The street was dry, and the footprints were still appearing.",
    ],
    short: ["My reflection waved before I raised my hand. It has not stopped.", "The clock began moving backward after I took out the battery.", "My unplugged headphones are still playing someone's breathing.", "There is an extra stair tonight. It counted along in my voice.", "My switched-off phone says to stop pretending I am asleep.", "Something keeps humming the song I paused.", "The empty hallway looks less empty through my camera.", "Fresh wet footprints are appearing beside my bed. It has not rained."],
    details: ["I waited for an ordinary explanation. The silence seemed to be waiting with me.", "I turned the volume down, but the sound grew clearer.", "For a few seconds, everything became so quiet that I could hear the fabric move when I breathed.", "I kept looking at the light switch instead of the dark space beside it.", "Nothing moved when I looked directly at it. The corner of my eye told a different story.", "I said hello once, softly, and immediately wished I had stayed quiet.", "The room felt familiar in the wrong way, like a memory someone else had rearranged.", "I tried to remember whether it had been there before I noticed it."],
    thoughts: ["The worst part was how ordinary everything else looked.", "I wanted the next song to start, just so the silence would belong to something else.", "I kept telling myself that being tired can make strange things seem reasonable.", "Whatever it was, it seemed to understand that I had finally noticed.", "I had the uncomfortable feeling that I was interrupting something that had been happening for a long time.", "There are sounds a familiar room should never learn to make."],
    extras: ["I focused on small things I could explain: the shape of the chair, the fold in the curtain, the light beneath the door. Counting them made the gaps between them feel larger.", "I thought about leaving, but that would mean crossing the part of the room I could no longer persuade myself to look at. I stayed very still and listened.", "The playlist had stopped on a track I did not remember adding. There was no title on the screen, only a progress bar that was slowly filling in the wrong direction.", "After a while, I started listening for the normal sounds again. A passing engine, a distant door, anything that would remind me the rest of the world was still there.", "I tried to tell myself the room only felt different because I was frightened. Then I noticed that the quiet seemed to move whenever I turned my head.", "I kept waiting for a sudden noise to break the feeling. Somehow, the careful absence of any sound was worse than anything I had imagined hearing."],
    hopeful: ["I left the light on. The shadow stayed.", "I told myself morning would make it ordinary. The clock has not reached morning yet.", "I found the door handle at last. Something on the other side turned it first."],
    bittersweet: ["It sounded exactly like me, right up until it answered a question I had only thought.", "The song finally resumed, but the breathing kept its own rhythm.", "I am no longer sure which side of the silence I am on."],
    playful: ["Then it whispered the next line before the singer did.", "The music stopped again. This time, something said thank you.", "I reached for the volume. The empty chair creaked."],
    shortEndings: ["I have stopped looking directly at it.", "It knows I noticed.", "The light is not helping.", "The silence just answered.", "I do not remember pressing play.", "Something is waiting for the next track."],
    songs: ["bury a friend Billie Eilish", "Somebody's Watching Me Rockwell", "Season of the Witch Donovan"],
  },
};
const pick = values => values[randomInt(values.length)];

function generateLocalDraft(settings) {
  const storyType = pick(settings.storyTypes || ["funny", "horror"]);
  const voice = library[storyType];
  const style = settings.style === "mixed" ? pick(["casual", "reflective", "poetic"]) : settings.style;
  const tone = settings.tone === "mixed" ? pick(["hopeful", "bittersweet", "playful"]) : settings.tone;
  const length = settings.length === "mixed" ? pick(["short", "medium", "long"]) : settings.length;
  const scene = pick(length === "short" ? voice.short : voice.scenes);
  const ending = pick(length === "short" ? voice.shortEndings : voice[tone]);
  let parts = [scene, ending];
  if (length !== "short") parts = [scene, pick(voice.details), pick(voice.thoughts), ending];
  if (length === "long") {
    const extras = [...voice.extras];
    for (let i = 0; i < 3; i++) parts.splice(-1, 0, extras.splice(randomInt(extras.length), 1)[0]);
  }
  if (style === "reflective" && length !== "short") parts.unshift(parts.splice(2, 1)[0]);
  const separator = style === "poetic" || length === "long" ? "\n\n" : " ";
  let content = parts.join(separator);
  if (length === "medium" && content.length > 600) content = [scene, parts[2], ending].join(separator);
  return { content, songQuery: pick(voice.songs), storyType,
    category: pick(settings.categories) };
}
module.exports = { generateLocalDraft };
