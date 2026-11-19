// WeAllEat help articles. The NVIDIA help assistant may only answer from these.
// Keep them in sync with the "Common issues" list in src/web/index.html.
// roles: which users see the article ("all" = everyone).

const HELP_ARTICLES = [
  // Donors
  { roles: ["donor"], q: "Will I get my pans and trays back?", a: "When posting, mark the food as bulk and choose \"Yes, please return them\". The kitchen must agree to return them before it can claim. You'll see them under \"Containers to get back\" and can tap \"Got them back\". Late returns alert support." },
  { roles: ["donor"], q: "The kitchen's PIN won't work", a: "After 3 wrong tries it locks. Ask the kitchen to tap \"Get a new PIN\" in their app and read it to you. If it locks again, support is alerted automatically." },
  { roles: ["donor"], q: "No kitchen can take my food", a: "Tap \"Offer fewer servings\", or call one of the kitchens listed under the donation. Their numbers are right there." },
  { roles: ["donor"], q: "The kitchen is late", a: "Their phone number is on the donation. If they cancel, the food goes to the next kitchen on its own." },
  { roles: ["donor"], q: "How do I post food?", a: "Press \"Post extra food\", then choose how it's stored (cold, hot, dry or frozen), the number of servings, any allergens, and a pickup cutoff of up to two hours." },
  { roles: ["donor"], q: "Who decides which kitchen gets my food?", a: "Fixed rules, not AI. A kitchen is only offered food it can store, has room for, and can reach before your cutoff. The closest one that fits is offered first." },

  // Kitchens
  { roles: ["kitchen"], q: "How do neighbors get bulk food?", a: "On the \"On hand\" tab, choose how neighbors get it: eat here only, bring their own container, either, or you provide containers. Neighbors see this before they reserve." },
  { roles: ["kitchen"], q: "We have a donor's containers", a: "Wash them and tap \"Containers returned\" on the \"On hand\" tab once they're back with the donor. If they're late, support is alerted and you can't claim food that needs containers returned until they're back." },
  { roles: ["kitchen"], q: "We can't make a pickup", a: "Tap \"Cancel pickup\" and pick a reason. The food goes straight to the next kitchen that can take it." },
  { roles: ["kitchen"], q: "The food isn't safe or isn't as listed", a: "Don't take it. Tap \"Cancel pickup\" and choose \"The food isn't as listed\". It's pulled and the donor is told." },
  { roles: ["kitchen"], q: "The donor's PIN entry locked", a: "Tap \"Get a new PIN\" on the pickup and read it to the donor. You can do this once; after that, support steps in." },
  { roles: ["kitchen"], q: "A neighbor is late for their meal", a: "Call the number on their reservation. If their hold runs out, the servings go back on offer automatically." },
  { roles: ["kitchen"], q: "Someone walked in without a reservation", a: "Open the \"On hand\" tab and tap \"Serve walk-in\" on the food you're giving them, so the servings left stay accurate." },
  { roles: ["kitchen"], q: "Why don't I see some donations?", a: "You only see food you can store, have room for, and can reach in time within your travel distance. You can change your storage types, daily room and travel distance in your profile." },

  // Community
  { roles: ["community"], q: "Do I need to bring a container?", a: "Check the label on the meal. \"Packed to go\" and \"containers provided\" mean no. \"Bring a container\" means bring one with a lid. \"Eat here only\" means it's served at the kitchen." },
  { roles: ["community"], q: "Can I take food home to eat later?", a: "Only if the meal says it's to go, or \"Eat here or bring a container\". If you take it home, eat it soon or refrigerate it within 2 hours." },
  { roles: ["community"], q: "I'm running late", a: "Call the kitchen. Their number is on your reservation." },
  { roles: ["community"], q: "I can't make it anymore", a: "Tap \"Cancel\" on your reservation so someone else can have the food." },
  { roles: ["community"], q: "I don't have my code", a: "Tell the kitchen your name. They can see your reservation and your phone number." },
  { roles: ["community"], q: "How long is food held for me?", a: "Your food is held for the pickup window shown on your reservation. If you don't pick it up in time, it goes back on offer for others." },
  { roles: ["community"], q: "How do I see kitchens farther away?", a: "Change the distance at the top of \"Meals near you\" (1, 3, 5 or 10 miles), or update where you start from in your profile." },

  // Staff
  { roles: ["staff"], q: "Who handles what?", a: "Donors, kitchens and neighbors fix most things themselves. Staff only see items that need a person: second PIN lockouts, food no kitchen can take, food about to expire, and support messages." },

  // Everyone
  { roles: ["guest", "all"], q: "I can't sign in", a: "Check the email you signed up with, or send a message to support from the Help panel." },
  { roles: ["guest", "all"], q: "I'm hungry and don't have a phone or account", a: "Walk in to any partner kitchen during serving hours. You don't need WeAllEat to get a meal." },
  { roles: ["all"], q: "Someone got sick or is in danger", a: "Call 911. If someone may have food poisoning, call 911 or Poison Control at 1-800-222-1222." },
];

module.exports = { HELP_ARTICLES };
