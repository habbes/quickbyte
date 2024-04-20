# 2024-04-14 Reach out to active users

At this point the app has crossed the 200GB mark in total storage of uploaded files. The files are spread across 29 projects in 18 accounts. I have not done any extensive marketing so far and most users were onboarded directly by me or someone I onboarded.

But I don't know everyone using the platform, why they're using it, what painpoints they face, etc. So I would like to reach out to them and find.

First I need to find out who's using the platform. To get this information, I ran the following query which finds users based on transfers.

```javascript
use("quickbyte")

db.transfers.aggregate([
  {
    $sort: { _createdAt: -1 }
  },
  {
    $lookup: {
      from: "users",
      foreignField: "_id",
      localField: "_createdBy._id",
      as: "creator"
    }
  },
  {
    $unwind: "$creator"
  },
  {
    $project: {
      _id: 1,
      name: 1,
      _createdAt: 1,
      'creator._id': 1,
      'creator.name': 1,
      'creator.email': 1
    }
  },
  {
    $group: {
      _id: '$creator',
      resources: { $addToSet: '$name' }
    }
  }
]).toArray()
```

This returns a list of users and their emails, and foreach user it returns the list of transfers started by that user. By the number of transfers created, I can tell which users are most active. And based on the transfer name, I can also estimate which projects are active (because project transfers have a special naming convention).

Then I send the following email to each user:

Hi {Name},

I’m Clément, your point of contact for anything you need at Quickbyte. Thanks for using our platform.

I’m just checking in to see how you’re doing and how your experience with Quickbyte has been so far? 

I would also like to better understand how you’re using Quickbyte and what we can do to better serve you or improve your workflow. If you’re interested, you can reply to directly to this email, or you can schedule a call on my calendar at https://cal.com/habbes. You can also reach me on [WhatsApp](https://api.whatsapp.com/send/?phone=254726166685&text&type=phone_number).

Please don’t hesitate to respond to this email if you have any questions or requests along the way. Your reply comes right to my inbox and I’ll respond personally.

Regards,
Clément "Habbes" Habinshuti
Founder | [Quickbyte](https://quickbyte.io)
Want to chat? [Book some time on my calendar](https://cal.com/habbes)