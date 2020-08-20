import React, { Component, Fragment } from 'react';

import Post from '../../components/Feed/Post/Post';
import Button from '../../components/Button/Button';
import FeedEdit from '../../components/Feed/FeedEdit/FeedEdit';
import Input from '../../components/Form/Input/Input';
import Paginator from '../../components/Paginator/Paginator';
import Loader from '../../components/Loader/Loader';
import ErrorHandler from '../../components/ErrorHandler/ErrorHandler';
import './Feed.css';

class Feed extends Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: '',
    postPage: 1,
    postsLoading: true,
    editLoading: false
  };

  componentDidMount() {
    const graphqlQuery = {
      query: `
        {
          getUserStatus {
            status
          }
        }
      `
    };
    fetch('http://localhost:8080/graphql', {
      method: 'post',
      headers: {
        Authorization: `Bearer ${this.props.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(graphqlQuery)
    })
      .then(res => {
        return res.json();
      })
      .then(resData => {
        if(resData.errors) {
          throw new Error(resData.errors[0].message);
        }
        this.setState({ status: resData.data.getUserStatus.status });
      })
      .catch(this.catchError);

    this.loadPosts();
  }

  loadPosts = direction => {
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    let page = this.state.postPage;
    if (direction === 'next') {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === 'previous') {
      page--;
      this.setState({ postPage: page });
    }
   
    const graphqlQuery = {
      query: `
        {
          getPosts {
            posts {
              _id
              title
              content
              imageUrl
              creator {
                name
                _id
              }
              createdAt
              updatedAt
            }
            totalPosts
          }
        }
      `
    }
    fetch(`http://localhost:8080/graphql?page=${this.state.postPage}`, {
      headers: {
        Authorization: `Bearer ${this.props.token}`,
        'Content-Type': 'application/json'
      },
      method: 'post',
      body: JSON.stringify(graphqlQuery)
    })
      .then(res => {
        return res.json();
      })
      .then(resData => {
        if (resData.errors) {
          throw new Error(resData.errors[0].message);
        }
        this.setState({
          posts: resData.data.getPosts.posts.map(post => {
            return {
              ...post,
              imagePath: post.imageUrl
            };
          }),
          totalPosts: resData.data.getPosts.totalPosts,
          postsLoading: false
        });
        console.log(this.state.posts);
      })
      .catch(this.catchError);
  };

  statusUpdateHandler = event => {
    event.preventDefault();
    const graphqlQuery = {
      query: `
        mutation UpdateStatus($status: String!){
          updateStatus(statusInput: $status) {
            status
          }
        }
      `,
      variables: {
        status: this.state.status
      }
    }
    fetch('http://localhost:8080/graphql', {
      method: 'post',
      headers: {
        Authorization: `Bearer ${this.props.token}`,
        'Content-type': 'application/json'
      },
      body: JSON.stringify(graphqlQuery)
    })
      .then(res => {
        return res.json();
      })
      .then(resData => {
        if(resData.errors) {
          throw new Error(resData.errors[0].message);
        }
        this.setState(prevState => {
          return {
            status: resData.data.updateStatus.status
          }
        })
        console.log(resData);
      })
      .catch(this.catchError);
  };

  newPostHandler = () => {
    this.setState({ isEditing: true });
  };

  startEditPostHandler = postId => {
    this.setState(prevState => {
      const loadedPost = { ...prevState.posts.find(p => p._id === postId) };

      return {
        isEditing: true,
        editPost: loadedPost
      };
    });
  };

  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };

  finishEditHandler = postData => {
    this.setState({
      editLoading: true
    });
    const formData = new FormData();

    formData.append('image', postData.image);

    if(this.state.editPost) {
      formData.append('oldPath', this.state.editPost.imagePath);
    }
    fetch('http://localhost:8080/post-image', {
        method: 'put',
        headers: {
          Authorization: `Bearer ${this.props.token}`,
        },
        body: formData
      }
    )
    .then(result => {
      return result.json();
    })
    .then(fileResData => {
      console.log(fileResData);
      const imageUrl = fileResData.filePath;

      let graphqlQuery = {
        query: `
          mutation CreatePost($title: String!, $content: String!, $imageUrl: String!){
            createPost(postInput: {
              title: $title,
              content: $content
              imageUrl: $imageUrl }) {
              _id
              title
              content
              imageUrl
              creator {
                _id
                name
              }
              createdAt
            }
          }
        ` , 
        variables: {
          title: postData.title,
          content: postData.content,
          imageUrl: imageUrl
        }
      }

      if(this.state.editPost) {
        graphqlQuery = {
          query: `
            mutation EditPost($title: String!, $imageUrl: String!, $content: String!, $postId: String!) {
              editPost(postInput: {
                title: $title,
                imageUrl: $imageUrl,
                content: $content,
                postId: $postId
              }) {
                _id
                title
                content
                imageUrl
                creator {
                  _id
                  name
                }
                createdAt
                updatedAt
              }
            }
          `,
          variables: {
            title: postData.title,
            imageUrl: imageUrl,
            content: postData.content,
            postId: this.state.editPost._id
          }
        }
      }
      return fetch('http://localhost:8080/graphql', {
        method: 'post',
        headers: {
          Authorization: `Bearer ${this.props.token}`,
          'Content-type': 'application/json'
        },
        body: JSON.stringify(graphqlQuery)
      });
    })
    .then(res => {
      return res.json();
    })
    .then(resData => {
      let post;
      if (resData.errors) {
        throw new Error(resData.errors[0].message);
      }
      if(!this.state.editPost) {
        post = {
          ...resData.data.createPost,
          imagePath: resData.data.createPost.imageUrl
        };
      } else {
        post = {
          ...resData.data.editPost,
          imagePath: resData.data.editPost.imageUrl
        };
      }

      this.setState(prevState => {
        let updatedPosts = [...prevState.posts];
        updatedPosts.pop();
        updatedPosts.unshift(post);

        return {
          isEditing: false,
          editPost: null,
          editLoading: false,
          posts: updatedPosts
        };
      });
      this.loadPosts();
    })
    .catch(err => {
      console.log(err);
      this.setState({
        isEditing: false,
        editPost: null,
        editLoading: false,
        error: err
      });
    });
  };

  statusInputChangeHandler = (input, value) => {
    this.setState({ status: value });
  };

  deletePostHandler = postId => {
    this.setState({ postsLoading: true });
    const graphqlQuery = {
      query: `
        mutation DeletePost($postId: String!) {
          deletePost(postId: $postId) {
            _id
            title
            content
            imageUrl
            creator {
              _id
            }
            createdAt
            updatedAt
          }
        }
      `,
      variables: {
        postId: postId
      }
    }
    fetch(`http://localhost:8080/graphql`, {
      method: 'post',
      headers: {
        Authorization: `Bearer ${this.props.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(graphqlQuery)
    })
      .then(res => {
        return res.json();
      })
      .then(resData => {
        if(resData.errors) {
          throw new Error(resData.errors[0].message);
        }
        // this.loadPosts();
        this.setState(prevState => {
          const updatedPosts = prevState.posts.filter(p => p._id !== postId);
          return { posts: updatedPosts, postsLoading: false };
        });
      })
      .catch(err => {
        console.log(err);
        this.setState({ 
          postsLoading: false,
          error: err
        });
      });
  };

  errorHandler = () => {
    this.setState({ error: null });
  };

  catchError = error => {
    this.setState({ error: error });
  };

  render() {
    return (
      <Fragment>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
        />
        <section className="feed__status">
          <form onSubmit={this.statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={this.statusInputChangeHandler}
              value={this.state.status}
            />
            <Button mode="flat" type="submit">
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={this.newPostHandler}>
            New Post
          </Button>
          <Button mode="raised" design="accent"  link='/chat'>
            Chat With Users
          </Button>
        </section>
        <section className="feed">
          {this.state.postsLoading && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Loader />
            </div>
          )}
          {this.state.posts.length <= 0 && !this.state.postsLoading ? (
            <p style={{ textAlign: 'center' }}>No posts found.</p>
          ) : null}
          {!this.state.postsLoading && (
            <Paginator
            onPrevious={this.loadPosts.bind(this, 'previous')}
            onNext={this.loadPosts.bind(this, 'next')}
            lastPage={Math.ceil(this.state.totalPosts / 2)}
            currentPage={this.state.postPage}
            >
              {this.state.posts.map(post => (
                <Post
                  key={post._id}
                  id={post._id}
                  author={post.creator.name}
                  date={new Date(post.createdAt).toLocaleDateString('en-US')}
                  title={post.title}
                  image={post.imageUrl}
                  content={post.content}
                  onStartEdit={this.startEditPostHandler.bind(this, post._id)}
                  onDelete={this.deletePostHandler.bind(this, post._id)}
                />
              ))}
            </Paginator>
          )}
        </section>
      </Fragment>
    );
  }
}

export default Feed;
