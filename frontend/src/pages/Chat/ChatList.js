import React, { Component, Fragment } from 'react';
import openSocket from 'socket.io-client';
import Paginator from '../../components/Paginator/Paginator';
import ChatListItem from '../../components/Chat/ChatListItem/ChatListItem';
import Loader from '../../components/Loader/Loader';
import ErrorHandler from '../../components/ErrorHandler/ErrorHandler';
import './ChatList.css';

class ChatList extends Component {
  state = {
    usersLoading: true,
    users: [],
    totalUsers: 0,
    usersPage: 1,
  };

  componentDidMount() {
    this.loadUsers();
    // const socket = openSocket('http://localhost:8080');
    // socket.on('posts', data => {
    //   if(data.action === 'create') {
    //     this.addPost(data.post);
    //   } else if (data.action === 'update') {
    //     this.updatePost(data.post);
    //   } else if (data.action === 'delete') {
    //     this.loadPosts();
    //   }
    // });
  }

  loadUsers = direction => {
    if (direction) {
      this.setState({ usersLoading: true, users: [] });
    }
    let page = this.state.usersPage;
    if (direction === 'next') {
      page++;
      this.setState({ usersPage: page });
    }
    if (direction === 'previous') {
      page--;
      this.setState({ usersPage: page });
    }

    fetch(`http://localhost:8080/chat/get-users?page=${page}`, {
      headers: {
        Authorization: `Bearer ${this.props.token}`
      }
    })
      .then(res => {
        if (res.status !== 200) {
          throw new Error('Failed to fetch users.');
        }
        return res.json();
      })
      .then(resData => {
        this.setState( {
          users: [
            ...resData.users
          ],
          totalUsers: resData.totalItems,
          usersLoading: false
        })
        console.log(this.state.users);
      })
      .catch(this.catchError);
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

        <section className="chat-list">
        {this.state.usersLoading && (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Loader />
          </div>
        )}

        {this.state.users.length <= 0 && !this.state.usersLoading ? (
            <p style={{ textAlign: 'center' }}>No posts found.</p>
          ) : null}


        {!this.state.usersLoading && (
          <Paginator
          onPrevious={this.loadUsers.bind(this, 'previous')}
          onNext={this.loadUsers.bind(this, 'next')}
          lastPage={Math.ceil(this.state.totalUsers / 2)}
          currentPage={this.state.usersPage}
          >
            {this.state.users.map(user => (
                <ChatListItem
                  // key={post._id}
                  // id={post._id}
                  // author={post.creator.name}
                  // date={new Date(post.createdAt).toLocaleDateString('en-US')}
                  // title={post.title}
                  // image={post.imageUrl}
                  // content={post.content}
                  // onStartEdit={this.startEditPostHandler.bind(this, post._id)}
                  // onDelete={this.deletePostHandler.bind(this, post._id)}
                  userName ={user.name}
                  userId={user.id}
                />
              ))}
          </Paginator>
        )}
        </section>
      </Fragment>
    );
  }
}

export default ChatList;
