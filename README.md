# Edgy - A Tale of Exploration

## Introduction

Edgy is an attempt to create a decentralized compute platform. The introductory sentence sets a high bar for the goals and ambitions. In reality, this project delivers on:

- An API for Task management
- A process for running and updating the status of a task
- Some simple simulation for compute runtime

What it misses out on:

- Proper handling of storage and discrete storage based service
- IAM or anything related to task execution roles
- No secure sandbox for running task
- No option for supporting external dependencies

## Setup

To setup the project:

- Clone the project
- Run `npm i` to install all dependencies
- Run `npm run build` to build the project
- Rum `npm run start` to start the project

Logs are found under `~/.pm2/logs/`

## API Request Example

- Create a task (POST)

```
 curl -v -X POST -H "Content-Type: application/json" -d '{"name":"task1", "input": "const x=1; const y=2; console.log(x+y);"}' http://127.0.0.1:8080
```

- Create task (PUT) (with file)

```
 curl -v -X PUT -F "file=@sample/task.js;type=text/javascript" -F "name:task1" -F "input:task.js" -H "Content-Type:multipart/form-data" http://127.0.0.1:8080

```

- Get a task by ID (GET)

```
 curl -v -X GET http://127.0.0.1:8080/cf5a7dec-2d60-4adf-9393-8dab7050afd9

```

- Delete a task by ID (DELETE)

```
curl -v -X DELETE http://127.0.0.1:8080/cf5a7dec-2d60-4adf-9393-8dab7050afd9
```

## Testing

1. Create task with either PUT or POST endpoint
2. Check the task by fetching it with ID after a few seconds
3. Check the output log from `queue` to see the attempts and their logs

## Expt

A project under directory `expt` is the experimental project where I tested some of my initial ideas. That intrigued me most about the project was the idea of creating a secure sandbox on a client node that can expose a lightweight VM to run the code. Here's some of the ideas that are worth exploring going forward:

1. I tried to resolve dynamic imports. The idea was to parse `package.json` for dependencies and installing them. This works nicely and I can easily get the tarball for NPM projects and set them up

2. Another idea was to have a `virtual FS` (or an in-memory FS) where I can setup the project. This allows to keep the project files and data in memory and does not need to be setup on a client's FS, providing a nice sandbox. My initial idea was to use `memfs` for this. In the `expt/src/project.ts`, there is a working version where I was able to create an entire project in a `memfs.Volume`

3. Node's `vm` module was used as a "Virtual Machine"/runtime to execute the code. This module has many limitations. One key struggle was to connect the virtual FS with VM so vm can execute script and resolve dependencies from the virtual FS. However, this is something I could not accomplish. An alternative idea was to build the entire project into a single bundle file using `@vercel/ncc` and `webpack`. The former is quite simple and worked but again, had no way of connecting to the virutal FS. If the project was monkey-patched at source to replace `fs` with `memfs.Fs` then it would have been a major win

4. Lastly, I had an idea to collect the `stdout` and `stderr` from execution.

## Concluding Remarks

I had a lot of fun exploring some ideas and concepts for this project. It would have been nicer to have a more "fleshed out" implementation for demo. Maybe something I can pick in the next few weeks in my spare time!
