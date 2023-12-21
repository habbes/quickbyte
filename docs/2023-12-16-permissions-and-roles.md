# 2023-12-16 Brainstorming permissions and roles

This is a follow up to the [post on the user model](./2023-12-08-brainstorming-user-model.md). Quickbyte has users and accounts. A user represents a person who can authenticate and interact with Quickbyte resources. An account is tied to billing and subcriptions. All Quickbyte resources (projects, media, files, transfers) existing under an account. Accounts represent the highest level of isolation in Quickbyte. Each account has an owner, the user who created the account. At the moment Quickbyte has two type of users:
- "full" users, who have offially signed up to Quickbyte, when a user signs up, a default account is created for the them.
- guest users who have not signed up to Quickbyte, do not have an "account". But they can access resources of a project through an invitation from a project owner

At the moment the permission system is simple. Resources can only be accessed by the account owner (except for public resources which don't require authentication, like downloading files through a transfer link). But now it's time implement multi-user support for collaboration: multiple users having access to the same project to collaborate.

An account owner can grant to access to a project to different users with different roles. Different projects in a given account can be shared with different sets of users. To make it easier to organize projects that are access by the same users, we may introduce the concept of teams. What I'm not sure is whether to implement teams now or later.

If I introduce teams now, then I also have consider whether a project must belong to a team or whether it can be "floating" freely in the account. Can multiple teams have access to the same project or does a project only belong to a single team? Basically, should I consider a team like a group users, a way to bundle users who often work together with the same roles, or should I consider teams like a "folder" for projects.

For a start, permissions will be based on roles. Each role will have a pre-defined set of permissions for different types of resources. The roles will be pre-defined in the system. Allowing the user to defined their own roles or manage granular resource permissions is something we can consider in the future.

Roles:
- Reviewer: Can read project, open and download media, create and read comments. This is the only role available to guest accounts.
- Editor/Collaborator: Reviewer permissions + upload media, update versions, create projects?
- Administrator: Edit + Add/remove users to a project
- Owner: Administrator + cannot be removed by administrator (Owner only applies to account)

Authorization will be applied per operation. I need to decide how to map permissions to operations. One way is to have some authorization handler interface that contains permission verification methods that I can implement for each role and resource type:

```typescript
type ResourceType = 'project'|'media'|'comment', etc.

interface AuthorizationHandler {
    async verifyCanRead(authContext, resourceType, resourceId);
    async verifyCanWrite(authContext, resourceType, resourceId);
}
```

or it could be more specific like

```typescript
interface AuthorizationHandler {
    async verifyCanViewMedia(authContext, projectId);
    async verifyCanUploadMedia(authContext, projectId);
    async verifyCanCreatedProject(authContext, projectId);
}
```

The verify methods will throw an error if the the auth context does not have permission to access the resource.
Then to apply these checks, we simply call the verification method in the service method that implements the operation:

```javascript
class ProjectService {

    async uploadMedia(projectId, args) {
        await this.authHandler.verifyCanUploadMedia(this.authContext, projectId);

        try {
            // do work
        } catch (e) {
            ///
        }
    }
}
```

An alternative I have in mind is to annotate permissions in a more declarative way. Have a static list of permissions like: `Project.Comment.Create`, `Project.Comment.List`, `Project.Comment.Read`, etc. Then create an abstraction to map permissions to actions, like:

```javascript
const uploadMediaToProject = createCommand((args, context) => context.services.projects.uploadMedia(args), { permissions: ['Project.Comment.Create']})
```

Then generated command in the previous example, `uploadMediaToProject` is a function that encapsulates permission verification (and can be extended to handle other concerns). This is the function that will be called by API endpoints. In this model, API endpoints should directly access services since service implementations won't do any authorization validation.

This approach also requires a generic method that can extract the role that matches the current user and the resource being accessed. This would require a defining a standard way for automatically extracting this information from just the request context and arguments, rather than manually implementing access check methods.

The benefit of this approach is to decouple permission checks from the service methods and to make it easier to find out at a glance what permissions are required for each service. But this is something we can achieve with proper testing.

This approach seems like it would require more work and could be overkill and require thinking about edge cases. But I have implementing something similar in a past project: https://github.com/habbes/techies-welfare/blob/master/server/src/core/commands/commands.ts

I'll go with the AuthHandler interface and calling the verify methods in the service methods for now.


Lastly, how will permissions and roles be stored? We won't store permissions explicitly (since we don't allow custom roles or permissions), but we can store roles in the database in their own collection, based on a schema like:

```typescript

type Role = 'admin'|'editor'|'reviewer'
interface RoleRecord {
    userId: string;
    role: RoleType;
    resourceType: ResourceType;
    resourceId: string;
}
```

I'm debating whether to store `owner` as role in the db. The owner can be easily determined from the record of the resource itself, based on the `ownerId` or `createdBy` field. If we store the owner role in the db, we'd have to create a redundant db record for each resource we create. It would also require a migration job to backfill the db with ownership records of all the resources in the db so far.

However, if we don't store an owner role record in the db, then when we may need to retrieve the resource from the db before we check for permissions. This slightly complicates the permission verification. The verify method would accept the resource as an additional param. This could reduce calls to the db from 2 to 1 if the permission is granted for the resource owner and the auth context is the owner. But it makes the permission verification code more complex, less standardized (because we now have to do the check in the middle of the business logic code) and harder to reason about its correctness (i.e. did we check the permission a the correct place, is there a chance to leak data to user before permission is checked, is there an if-statement in the retrieval code, etc.)


